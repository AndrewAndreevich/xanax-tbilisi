# Waveform peaks for the album tracks the track view plays (assets/audio/tracks/*.mp3):
# 200 values 0..1 per track, like assets/audio/silence_in_motion.peaks.json, drawn as the HUD's waveform.
import json, subprocess, sys
from pathlib import Path
import numpy as np

for mp3 in sorted(Path("assets/audio/tracks").glob("*.mp3")):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(mp3), "-ac", "1", "-ar", "8000", "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    a = np.abs(np.frombuffer(raw, np.float32))
    p = np.array([np.sqrt((c * c).mean()) if len(c) else 0 for c in np.array_split(a, 200)])   # loudness, not the clipped peak
    p = p / max(p.max(), 1e-6)
    mp3.with_suffix(".peaks.json").write_text(json.dumps([round(float(v), 3) for v in p]))
    print(mp3.name, len(a) / 8000)
