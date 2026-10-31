# Word timings for the track lyrics: Whisper (faster-whisper) listens to each track and gives
# every word it hears a start / end; those words are matched in order to the lyrics on
# SoundCloud (the track description, as the site shows it), and lyric words Whisper missed get
# times spread between their matched neighbours.
# Writes assets/lyrics_sync.json: {title: {"text": [lines], "words": [[[start, end], ...] per line]}}
#   python -I tools/align_lyrics.py AUDIO_DIR [title ...]
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


def main():
    audio = Path(sys.argv[1])
    only = set(sys.argv[2:])
    # CUDA runtime from the nvidia-cublas-cu12 / nvidia-cudnn-cu12 wheels, if installed
    import os
    try:
        import nvidia.cublas, nvidia.cudnn
        for m in (nvidia.cublas, nvidia.cudnn):
            os.environ["PATH"] = os.path.join(list(m.__path__)[0], "bin") + os.pathsep + os.environ["PATH"]
    except ImportError:
        pass
    from faster_whisper import WhisperModel
    try:
        model = WhisperModel("large-v3", device="cuda", compute_type="float16")
    except Exception as e:
        print("no cuda:", e); model = WhisperModel("medium", device="cpu", compute_type="int8")
    data = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    for title, slug in TRACKS.items():
        if only and title not in only:
            continue
        lines = lyrics(slug)
        if not lines:
            print(title, "no lyrics"); continue
        words = [w for l in lines for w in l.split()]
        segs, _ = model.transcribe(pcm(audio / f"{slug}.mp3"), language="en", word_timestamps=True,
                                   initial_prompt=" ".join(lines)[:800], condition_on_previous_text=False,
                                   vad_filter=False, beam_size=5)
        heard = [(w.word.strip(), w.start, w.end) for s in segs for w in (s.words or [])]
        a = [norm(w) for w in words]
        b = [norm(w) for w, _, _ in heard]
        times = [None] * len(words)
        for blk in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
            for k in range(blk.size):
                _, s, e = heard[blk.b + k]
                times[blk.a + k] = [round(s, 2), round(e, 2)]
        matched = sum(t is not None for t in times)
        # missed words: spread between the matched neighbours (or 0.4 s apart at the ends)
        known = [i for i, t in enumerate(times) if t]
        for i in range(len(times)):
            if times[i]:
                continue
            p = max([k for k in known if k < i], default=None)
            n = min([k for k in known if k > i], default=None)
            if p is not None and n is not None:
                t0, t1 = times[p][1], times[n][0]
                f = (i - p) / (n - p)
                s = t0 + (t1 - t0) * f
                times[i] = [round(s, 2), round(min(t1, s + (t1 - t0) / (n - p)), 2)]
            elif p is not None:
                s = times[p][1] + 0.4 * (i - p); times[i] = [round(s, 2), round(s + 0.35, 2)]
            elif n is not None:
                s = max(0, times[n][0] - 0.4 * (n - i)); times[i] = [round(s, 2), round(s + 0.35, 2)]
            else:
                times[i] = [0, 0]
        per_line, k = [], 0
        for l in lines:
            n = len(l.split()); per_line.append(times[k:k + n]); k += n
        data[title] = {"text": lines, "words": per_line, "matched": round(matched / len(words), 2)}
        print(f"{title}: {matched}/{len(words)} words matched, heard {len(heard)}")
        OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


main()
