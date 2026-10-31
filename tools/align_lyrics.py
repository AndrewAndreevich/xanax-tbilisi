# Word timings for the track lyrics: Whisper (faster-whisper) listens to each track and gives
# every word it hears a start / end; those words are matched in order to the lyrics on
# SoundCloud (the track description, as the site shows it), and lyric words Whisper missed get
# times spread between their matched neighbours.
#   python -I tools/align_lyrics.py transcribe AUDIO_DIR CACHE_DIR [title ...]   (Whisper, slow; cached)
#   python -I tools/align_lyrics.py build "CACHE_DIR[;CACHE_DIR2]" [VOCALS_DIR]                -> assets/lyrics_sync.json
# AUDIO_DIR / VOCALS_DIR: Demucs output (python -m demucs --two-stems=vocals ...), <slug>/vocals.wav;
# the vocals also show where singing happens, so words Whisper missed are put there
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
        # the vocals alone (Demucs: AUDIO_DIR/<slug>/vocals.wav) if they are there, else the whole mix
        src = audio / slug / "vocals.wav"
        vocals = src.exists()
        segs, _ = model.transcribe(pcm(src if vocals else audio / f"{slug}.mp3"), language="en", word_timestamps=True,
                                   initial_prompt=(None if os.environ.get("NO_PROMPT") else " ".join(lines)[:800] or None), condition_on_previous_text=False,
                                   vad_filter=bool(os.environ.get("VAD")), beam_size=5)
        heard = [[w.word.strip(), round(w.start, 2), round(w.end, 2)] for s in segs for w in (s.words or [])]
        f.write_text(json.dumps({"lyrics": lines, "heard": heard}, ensure_ascii=False), encoding="utf-8")
        print(f"{title}: {len(heard)} words heard in {time.time() - t0:.0f} s", flush=True)


def voice(path):
    """Where someone sings: [(start, end)] from the separated vocals' loudness (50 ms steps),
    short gaps closed, blips dropped"""
    x = pcm(path)
    hop = 800
    n = len(x) // hop
    rms = np.sqrt((x[:n * hop].reshape(n, hop) ** 2).mean(1))
    on = rms > max(0.01, 0.2 * np.percentile(rms, 95))
    segs, k = [], 0
    while k < n:
        if on[k]:
            j = k
            while j < n and on[j]:
                j += 1
            segs.append([k * 0.05, j * 0.05]); k = j
        else:
            k += 1
    merged = []
    for a, b in segs:
        if merged and a - merged[-1][1] < 0.4:
            merged[-1][1] = b
        else:
            merged.append([a, b])
    return [(a, b) for a, b in merged if b - a >= 0.25]


def place(n, a, b, active):
    """n words sung somewhere between a and b: spread over the singing inside [a, b] (or evenly)"""
    seg = [(max(a, s0), min(b, e0)) for s0, e0 in active if e0 > a and s0 < b]
    total = sum(e0 - s0 for s0, e0 in seg)
    if not seg or total < 0.25 * n:
        st = min(0.45, (b - a) / max(1, n)) if b > a else 0.4
        return [[round(a + st * k, 2), round(a + st * (k + 1), 2)] for k in range(n)]
    step, res = total / n, []
    for k in range(n):
        want = step * k                              # how far into the singing this word starts
        for s0, e0 in seg:
            if want <= e0 - s0:
                t0 = s0 + want
                res.append([round(t0, 2), round(min(e0, t0 + min(step, 1.0)), 2)])
                break
            want -= e0 - s0
        else:
            res.append([round(seg[-1][1], 2), round(seg[-1][1] + 0.3, 2)])
    return res


def sung(lines, heard, active=None):
    """The lyrics in the order they are sung: walking through what Whisper heard, each stretch is
    matched to the next line of the text or to a line sung before (a chorus coming back). Lines
    Whisper did not catch are kept in their place. Returns [(line index, [[start, end] per word])]."""
    active = active or []
    if active:                                               # words heard where nobody sings are made up
        heard = [h for h in heard if any(h[1] < e0 + 1.0 and h[2] > s0 - 1.0 for s0, e0 in active)]
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
    # a line kept as "not heard" that turns up heard a moment later is the same line: drop the copy
    same = lambda a, b: L[a] == L[b]
    out = [(i, ts) for k, (i, ts) in enumerate(out)
           if any(ts) or not any(same(i, j) and any(t2) for j, t2 in out[k + 1:k + 5])]
    end = active[-1][1] if active else None
    # still singing after the last words Whisper caught (and the lines left over need far less
    # time than that): the song ends on its chorus, which Whisper often drops — it is repeated
    # until the singing stops
    known_t = [t for _, ts in out for t in ts if t]
    if active and known_t:
        last = max(t[1] for t in known_t)
        left = sum(len(ts) for i, ts in out[max(k for k, (_, ts) in enumerate(out) if any(ts)) + 1:])
        after = sum(max(0, e0 - max(s0, last)) for s0, e0 in active if e0 > last)
        key = lambda i: " ".join(L[i])
        seen = {}
        for i, _ in out:
            seen[key(i)] = seen.get(key(i), 0) + 1
        # the chorus once: the last run of repeated lines in the song, cut to its shortest cycle
        run = []
        for i, _ in reversed(out):
            if seen[key(i)] > 1:
                run.insert(0, i)
            elif run:
                break
        unit = run
        for per in range(1, len(run) + 1):
            if all(key(run[q]) == key(run[q % per]) for q in range(len(run))):
                unit = run[:per]; break
        per_word = 0.5
        need = sum(len(L[i]) for i in unit) * per_word
        reps = 0
        while unit and need and after - left * per_word - need * (reps + 1) > -need * 0.3 and reps < 8:
            reps += 1
        for _ in range(reps):
            for i in unit:
                out.append((i, [None] * len(L[i])))
    # words without a time: placed where the singing is between the nearest timed words around them
    flat = [t for _, ts in out for t in ts]
    line_of = [q for q, (_, ts) in enumerate(out) for _ in ts]
    k = 0
    while k < len(flat):
        if flat[k]:
            k += 1; continue
        j = k
        while j < len(flat) and not flat[j]:
            j += 1
        a = flat[k - 1][1] if k else (active[0][0] if active else 0)
        b = flat[j][0] if j < len(flat) else (end if end and end > a else a + 0.45 * (j - k))
        # missing words of a line whose other words were heard are sung right next to them,
        # not spread over a long gap
        tight = 0.5 * (j - k) + 0.3
        if b - a > tight * 2:
            if j < len(flat) and line_of[j] == line_of[j - 1]:
                a = b - tight                                  # the line's start, just before its heard rest
            elif k and line_of[k - 1] == line_of[k]:
                b = a + tight                                  # the line's end, just after its heard start
        flat[k:j] = place(j - k, a, b, active)
        k = j
    flat = [[s0, round(min(e0, s0 + 1.5), 2)] for s0, e0 in flat]   # a held note or a gap: no word stays lit for long
    res, q = [], 0
    for i, ts in out:
        res.append((i, flat[q:q + len(ts)]))
        q += len(ts)
    return res


def matched(lines, heard):
    a = [norm(w) for l in lines for w in l.split()]
    b = [norm(w) for w, _, _ in heard]
    return sum(x.size for x in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks())


def build(caches, vocals=None):
    """lyrics_sync.json: for each track the lines as sung (choruses repeated in full), the stanza
    each line belongs to (a new stanza where a chorus starts or ends, or after a pause) and the
    time of every word. "src" is the SoundCloud text it was made from."""
    data = {}
    for title, slug in TRACKS.items():
        # Whisper on the mix and on the bare vocals: take whichever caught more of the lyrics
        runs = [json.loads((c / f"{slug}.json").read_text(encoding="utf-8")) for c in caches if (c / f"{slug}.json").exists()]
        if not runs:
            continue
        d = max(runs, key=lambda r: matched(r["lyrics"], r["heard"]))
        lines, heard = d["lyrics"], d["heard"]
        if not lines:
            continue
        wav = vocals / slug / "vocals.wav" if vocals else None
        seq = sung(lines, heard, voice(wav) if wav and wav.exists() else None)
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
        build([Path(c) for c in str(audio_or_cache).split(";")], Path(sys.argv[3]) if len(sys.argv) > 3 else None)
