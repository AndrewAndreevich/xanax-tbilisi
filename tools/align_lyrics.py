# Word timings for the track lyrics: Whisper (faster-whisper) listens to each track and gives
# every word it hears a start / end; those words are matched in order to the lyrics on
# SoundCloud (the track description, as the site shows it), and lyric words Whisper missed get
# times spread between their matched neighbours.
#   python -I tools/align_lyrics.py transcribe AUDIO_DIR CACHE_DIR [title ...]   (Whisper, slow; cached)
#   python -I tools/align_lyrics.py build CACHE_DIR                             -> assets/lyrics_sync.json
# AUDIO_DIR holds <slug>.mp3 for each track (downloaded from the band's SoundCloud, not in the repo).
import difflib, json, re, subprocess, sys, urllib.parse, urllib.request
import numpy as np
from pathlib import Path

TRACKS = {   # title -> SoundCloud slug, as PLAYABLE in main.js
    "EUROORGASM": "euroorgasm", "RADIO KABUL": "radio-kabul", "VLADIMIR PUTIN IS DEAD": "putin-is-dead",
    "NATURAL DEMOCRAT": "natural-democrat", "STALIN MOUSTACHE": "stalin-moustache", "DYING SWAN": "the-dying-swan",
    "RUSSIANS GO HOME": "russians-go-home", "S. L. O. N.": "slon",
    "WHERE I'VE BEEN LAST 8 YEARS": "where-ive-been-last-8-years-acoustic", "XNX TBS": "xnx-tbs", "CRYPTO ACAB": "crypto-acab",
}
OUT = Path("assets/lyrics_sync.json")


def lyrics(slug):
    url = "https://soundcloud.com/oembed?format=json&url=" + urllib.parse.quote(f"https://soundcloud.com/xanaxtbilisi/{slug}")
    d = json.load(urllib.request.urlopen(url)).get("description") or ""
    return [l.strip() for l in d.splitlines() if l.strip()]          # same lines as startTrack in main.js


def pcm(path):
    """16 kHz mono float samples via ffmpeg (faster-whisper's own decoder does not run with this PyAV)"""
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower().replace("’", "'"))


def transcribe(audio, cache, only):
    """Whisper's words with times for every track -> cache/<slug>.json (kept, so the layout can be
    rebuilt without listening again)"""
    import os, time
    # CUDA runtime from the nvidia-cublas-cu12 / nvidia-cudnn-cu12 wheels, if installed
    try:
        import nvidia.cublas, nvidia.cudnn
        for m in (nvidia.cublas, nvidia.cudnn):
            os.environ["PATH"] = os.path.join(list(m.__path__)[0], "bin") + os.pathsep + os.environ["PATH"]
    except ImportError:
        pass
    from faster_whisper import WhisperModel
    model = WhisperModel("large-v3", device="cuda", compute_type="float16")
    cache.mkdir(parents=True, exist_ok=True)
    for title, slug in TRACKS.items():
        f = cache / f"{slug}.json"
        if (only and title not in only) or f.exists():
            continue
        lines = lyrics(slug)
        t0 = time.time()
        segs, _ = model.transcribe(pcm(audio / f"{slug}.mp3"), language="en", word_timestamps=True,
                                   initial_prompt=(None if os.environ.get("NO_PROMPT") else " ".join(lines)[:800] or None), condition_on_previous_text=False,
                                   vad_filter=False, beam_size=5)
        heard = [[w.word.strip(), round(w.start, 2), round(w.end, 2)] for s in segs for w in (s.words or [])]
        f.write_text(json.dumps({"lyrics": lines, "heard": heard}, ensure_ascii=False), encoding="utf-8")
        print(f"{title}: {len(heard)} words heard in {time.time() - t0:.0f} s", flush=True)


def sung(lines, heard):
    """The lyrics in the order they are sung: walking through what Whisper heard, each stretch is
    matched to the next line of the text or to a line sung before (a chorus coming back). Lines
    Whisper did not catch are kept in their place. Returns [(line index, [[start, end] per word])]."""
    L = [[norm(w) for w in l.split()] for l in lines]
    # a misheard word counts as the lyric word it nearly is ("shine" ~ "shines", "lovers" ~ "flowers")
    vocab = sorted(set(w for l in L for w in l))
    def near(h):
        if h in vocab or len(h) < 4:
            return h
        best = max(vocab, key=lambda v: difflib.SequenceMatcher(None, h, v).ratio())
        return best if difflib.SequenceMatcher(None, h, best).ratio() >= 0.8 else h
    H = [near(norm(w)) for w, _, _ in heard]

    def fit(i, p):                       # how well line i matches the heard words from p on
        n = len(L[i])
        win = H[p:p + n + 3]
        m = difflib.SequenceMatcher(None, L[i], win, autojunk=False)
        pairs = [(blk.a + k, p + blk.b + k) for blk in m.get_matching_blocks() for k in range(blk.size)]
        if not pairs or pairs[0][1] - p > 1:
            return 0, pairs
        return len(pairs) / n, pairs

    out, nxt, p = [], 0, 0
    while p < len(H):
        best = (0, None, None)
        for k in range(len(lines) - nxt):                   # the next line, or a later one (lines Whisper missed)
            i = nxt + k
            sc, pr = fit(i, p)
            sc += 0.15 - 0.12 * k if k < 3 else -0.3
            if sc > best[0]:
                best = (sc, i, pr)
        for i in sorted(set(j for j, _ in out)):            # a line sung before: a repeat
            sc, pr = fit(i, p)
            if sc >= 0.6 and sc > best[0]:
                best = (sc, i, pr)
        sc, i, pr = best
        if i is None or sc < 0.5:
            p += 1
            continue
        for j in range(nxt, i):                              # lines skipped over: not heard, keep them
            out.append((j, [None] * len(L[j])))
        times = [None] * len(L[i])
        for wa, wb in pr:
            times[wa] = [heard[wb][1], heard[wb][2]]
        out.append((i, times))
        nxt = max(nxt, i + 1)
        p = pr[-1][1] + 1
    for j in range(nxt, len(lines)):
        out.append((j, [None] * len(L[j])))
    # words without a time: spread between the nearest timed words around them
    flat = [t for _, ts in out for t in ts]
    known = [k for k, t in enumerate(flat) if t]
    for k, t in enumerate(flat):
        if t:
            continue
        pv = max([q for q in known if q < k], default=None)
        nx = min([q for q in known if q > k], default=None)
        if pv is not None and nx is not None:
            a, b = flat[pv][1], flat[nx][0]
            st = min(0.45, (b - a) / (nx - pv))             # across an instrumental gap: sung right after
            flat[k] = [round(a + st * (k - pv), 2), round(a + st * (k - pv + 1), 2)]
        elif pv is not None:
            s0 = flat[pv][1] + 0.4 * (k - pv)
            flat[k] = [round(s0, 2), round(s0 + 0.35, 2)]
        else:
            s0 = max(0, flat[nx][0] - 0.4 * (nx - k)) if nx is not None else 0
            flat[k] = [round(s0, 2), round(s0 + 0.35, 2)]
    flat = [[s0, round(min(e0, s0 + 1.5), 2)] for s0, e0 in flat]   # a held note or a gap: no word stays lit for long
    res, q = [], 0
    for i, ts in out:
        res.append((i, flat[q:q + len(ts)]))
        q += len(ts)
    return res


def build(cache):
    """lyrics_sync.json: for each track the lines as sung (choruses repeated in full), the stanza
    each line belongs to (a new stanza where a chorus starts or ends, or after a pause) and the
    time of every word. "src" is the SoundCloud text it was made from."""
    data = {}
    for title, slug in TRACKS.items():
        f = cache / f"{slug}.json"
        if not f.exists():
            continue
        d = json.loads(f.read_text(encoding="utf-8"))
        lines, heard = d["lyrics"], d["heard"]
        if not lines:
            continue
        seq = sung(lines, heard)
        # a chorus line: the same words sung more than once (the text may also write it out twice)
        key = lambda i: " ".join(norm(w) for w in lines[i].split())
        count = {}
        for i, _ in seq:
            count[key(i)] = count.get(key(i), 0) + 1
        chorus = lambda i: count[key(i)] > 1
        # stanzas: a run of 3+ chorus lines in a row is a chorus of its own; a refrain line coming
        # back every other line stays in its verse; otherwise a pause of 3.5 s starts a new stanza
        run = [0] * len(seq)
        k = 0
        while k < len(seq):
            j = k
            while j < len(seq) and chorus(seq[j][0]):
                j += 1
            for q in range(k, j):
                run[q] = j - k
            k = max(j, k + 1)
        block = lambda k: run[k] >= 3
        stanza, st = [], 0
        for k, (i, ts) in enumerate(seq):
            if k:
                pts = seq[k - 1][1]
                pause = ts[0][0] - pts[-1][1] > 3.5 and not (chorus(i) and chorus(seq[k - 1][0]))
                if block(k) != block(k - 1) or pause:
                    st += 1
            stanza.append(st)
        data[title] = {"src": lines, "lines": [lines[i] for i, _ in seq], "stanza": stanza,
                       "words": [ts for _, ts in seq]}
        print(f"{title}: {len(lines)} lines written, {len(seq)} sung, {st + 1} stanzas")
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    cmd, audio_or_cache = sys.argv[1], Path(sys.argv[2])
    if cmd == "transcribe":
        transcribe(audio_or_cache, Path(sys.argv[3]), set(sys.argv[4:]))
    if cmd == "build":
        build(audio_or_cache)
