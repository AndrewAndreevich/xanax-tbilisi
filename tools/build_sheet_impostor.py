"""Turn a generated turnaround sheet (views in a grid on white) into an impostor atlas the
track view can spin: assets/<name>.webp + <name>.json (same format as prius.json).

Each cell is keyed off the white with the builder's border flood-fill cutout (white inside the
outline stays), all views get one scale and a common bottom line, centred on their own middle,
plus a silhouette profile per view for the lyrics to flow round.

usage: python tools/build_sheet_impostor.py SHEET NAME [--cols 4 --rows 2 --cell-w 256 --cell-h 512]
"""

import argparse
import json
import os
import sys
import tempfile

import numpy as np
from PIL import Image

sys.path.insert(0, "E:/Workspace/pvf_character_builder")
from pipeline.impostor import cutout  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("sheet")
ap.add_argument("name")
ap.add_argument("--cols", type=int, default=4)
ap.add_argument("--rows", type=int, default=2)
ap.add_argument("--cell-w", type=int, default=256)
ap.add_argument("--cell-h", type=int, default=512)
a = ap.parse_args()
OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
PROFILE_ROWS = 64

sheet = Image.open(a.sheet).convert("RGB")
gw, gh = sheet.width // a.cols, sheet.height // a.rows
tmp = tempfile.mkdtemp()
views = []
for r in range(a.rows):
    for c in range(a.cols):
        p = os.path.join(tmp, f"v{r}{c}.png")
        sheet.crop((c * gw, r * gh, (c + 1) * gw, (r + 1) * gh)).save(p)
        views.append(cutout(p, white=232))

boxes = [v.getbbox() for v in views]
tallest = max(b[3] - b[1] for b in boxes)
widest = max(b[2] - b[0] for b in boxes)
CW, CH = a.cell_w, a.cell_h
scale = min(CH * 0.96 / tallest, CW * 0.96 / widest)
floor = int(CH * 0.98)
atlas = Image.new("RGBA", (a.cols * CW, a.rows * CH))
frames = []
for i, (v, (x0, y0, x1, y1)) in enumerate(zip(views, boxes)):
    crop = v.crop((x0, y0, x1, y1))
    w, h = max(1, round(crop.width * scale)), max(1, round(crop.height * scale))
    crop = crop.resize((w, h), Image.LANCZOS)
    ox, oy = (i % a.cols) * CW, (i // a.cols) * CH
    atlas.paste(crop, (ox + (CW - w) // 2, oy + floor - h), crop)
    cell = np.asarray(atlas.crop((ox, oy, ox + CW, oy + CH)).getchannel("A"))
    prof = []
    for k in range(PROFILE_ROWS):
        band = cell[int(k * CH / PROFILE_ROWS):int((k + 1) * CH / PROFILE_ROWS)].max(0)
        xs = np.nonzero(band > 60)[0]
        prof.append([round(xs.min() / CW, 3), round((xs.max() + 1) / CW, 3)] if len(xs) else None)
    frames.append({"profile": prof})

atlas.save(os.path.join(OUT, f"{a.name}.webp"), quality=88, method=6)
json.dump({"cols": a.cols, "rows": a.rows, "cellW": CW, "cellH": CH, "frames": frames},
          open(os.path.join(OUT, f"{a.name}.json"), "w"), separators=(",", ":"))
print(a.name, "frames", len(frames), "atlas", atlas.size)
