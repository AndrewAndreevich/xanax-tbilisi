"""Pack the textured Prius orbit (pvf_character_builder/build/prius, one ring at
eye level, green screen) into assets/prius.webp + prius.json for the track view.

48 frames out of the 193-frame orbit, keyed with the builder's chroma cutout, one
crop box for all frames (the orbit is already centred and constant size), plus a
per-frame silhouette profile so the lyrics can flow round the car.

usage: python tools/build_prius.py
"""

import glob
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

BUILDER = "E:/Workspace/pvf_character_builder"
sys.path.insert(0, BUILDER)
from pipeline.impostor import chroma_cutout, KEY_GREEN  # noqa: E402

VIDEO = f"{BUILDER}/build/prius/prius_el00_seedance_2_0_mini.mp4"
OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
N, COLS, CW = 48, 8, 384
PROFILE_ROWS = 64

tmp = tempfile.mkdtemp()
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", VIDEO, os.path.join(tmp, "v%04d.png")], check=True)
files = sorted(glob.glob(os.path.join(tmp, "v*.png")))[:-1]          # last frame repeats the first
pick = [files[round(i * len(files) / N)] for i in range(N)]
cut = [chroma_cutout(f, KEY_GREEN) for f in pick]

# one box for every frame: union of the silhouettes
boxes = [c.getbbox() for c in cut]
x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
pad = 6
box = (max(0, x0 - pad), max(0, y0 - pad), x1 + pad, y1 + pad)
bw, bh = box[2] - box[0], box[3] - box[1]
CH = round(CW * bh / bw)
rows = (N + COLS - 1) // COLS
atlas = Image.new("RGBA", (COLS * CW, rows * CH))
frames = []
for i, c in enumerate(cut):
    cell = c.crop(box).resize((CW, CH), Image.LANCZOS)
    atlas.paste(cell, ((i % COLS) * CW, (i // COLS) * CH))
    a = np.asarray(cell.getchannel("A"))
    prof = []
    for r in range(PROFILE_ROWS):
        band = a[int(r * CH / PROFILE_ROWS):int((r + 1) * CH / PROFILE_ROWS)].max(0)
        xs = np.nonzero(band > 60)[0]
        prof.append([round(xs.min() / CW, 3), round((xs.max() + 1) / CW, 3)] if len(xs) else None)
    frames.append({"profile": prof})

atlas.save(os.path.join(OUT, "prius.webp"), quality=86, method=6)
json.dump({"cols": COLS, "rows": rows, "cellW": CW, "cellH": CH, "frames": frames},
          open(os.path.join(OUT, "prius.json"), "w"), separators=(",", ":"))
print("frames", N, "cell", CW, CH, "atlas", atlas.size)
