"""Pack char01 ring16 views into the site's body + bust impostor atlases.

Reuses the background cutout from pvf_character_builder/pipeline/impostor.py.
Writes into assets/:
  arseny_body.webp / .json  — 8x2 tall cells, one scale, feet on one line,
                              plus a per-frame silhouette profile the case-file
                              text flows around
  arseny_bust.webp / .json  — 8x2 square head-and-shoulders crops of the same frames

usage: python tools/build_impostor.py [views_dir]
"""

import json
import os
import re
import sys

import numpy as np
from PIL import Image

BUILDER = "E:/Workspace/pvf_character_builder"
sys.path.insert(0, BUILDER)
from pipeline.impostor import cutout  # noqa: E402

VIEWS = sys.argv[1] if len(sys.argv) > 1 else \
    f"{BUILDER}/build/characters/char01/male-idle_static-ring16/views/ai"
OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
COLS, CW, CH = 8, 384, 768          # body cell
BUST = 512                          # bust cell
PROFILE_ROWS = 160
MARGIN = 0.02

files = sorted((f for f in os.listdir(VIEWS) if f.endswith(".png")),
               key=lambda f: int(re.search(r"az(\d+)", f).group(1)))
cut = [cutout(os.path.join(VIEWS, f)) for f in files]


def bbox(img):
    a = np.asarray(img.getchannel("A"))
    ys, xs = np.nonzero(a > 8)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


boxes = [bbox(c) for c in cut]
tallest = max(b[3] - b[1] for b in boxes)
widest = max(b[2] - b[0] for b in boxes)
scale = min(CH * (1 - 2 * MARGIN) / tallest, CW * (1 - 2 * MARGIN) / widest)
rows = (len(cut) + COLS - 1) // COLS
floor_y = int(CH * (1 - MARGIN))

body = Image.new("RGBA", (COLS * CW, rows * CH))
bust = Image.new("RGBA", (COLS * BUST, rows * BUST))
frames = []
for i, (img, (x0, y0, x1, y1)) in enumerate(zip(cut, boxes)):
    # body: every frame scaled to the same height, head on one vertical axis, feet on
    # floor_y. The views are generated one by one, so their size and centring drift
    # a little; the head is what the eye tracks while the figure turns.
    crop = img.crop((x0, y0, x1, y1))
    a = np.asarray(crop.getchannel("A")).astype(float)
    head = a[: int(a.shape[0] * 0.12)]
    cx = (head.sum(0) * np.arange(head.shape[1])).sum() / head.sum()
    fs = scale * tallest / crop.height
    w, h = max(1, round(crop.width * fs)), max(1, round(crop.height * fs))
    small = crop.resize((w, h), Image.LANCZOS)
    px = (i % COLS) * CW + int(CW / 2 - cx * fs)
    py = (i // COLS) * CH + floor_y - h
    body.paste(small, (px, py), small)

    # silhouette profile in cell-normalised coords: rows top->bottom, [left, right] or null
    cell = np.asarray(body.crop(((i % COLS) * CW, (i // COLS) * CH,
                                 (i % COLS + 1) * CW, (i // COLS + 1) * CH)).getchannel("A"))
    prof = []
    for r in range(PROFILE_ROWS):
        band = cell[int(r * CH / PROFILE_ROWS):int((r + 1) * CH / PROFILE_ROWS)].max(0)
        xs = np.nonzero(band > 40)[0]
        prof.append([round(xs.min() / CW, 3), round((xs.max() + 1) / CW, 3)] if len(xs) else None)

    # bust: square around the head, same head size and position on every frame
    side = int(crop.height * 0.36)
    hx = x0 + cx
    bx0, by0 = int(hx - side / 2), int(y0 - side * 0.06)
    b = img.crop((bx0, by0, bx0 + side, by0 + side)).resize((BUST, BUST), Image.LANCZOS)
    bust.paste(b, ((i % COLS) * BUST, (i // COLS) * BUST), b)

    frames.append({"azimuth": int(re.search(r"az(\d+)", files[i]).group(1)), "profile": prof})

body.save(os.path.join(OUT, "arseny_body.webp"), quality=88, method=6)
bust.save(os.path.join(OUT, "arseny_bust.webp"), quality=88, method=6)
meta = {"cols": COLS, "rows": rows, "cellW": CW, "cellH": CH, "floor": floor_y / CH,
        "top": (floor_y - tallest * scale) / CH, "frames": frames}
json.dump(meta, open(os.path.join(OUT, "arseny_body.json"), "w"), separators=(",", ":"))
json.dump({"cols": COLS, "rows": rows, "cell": BUST, "count": len(frames)},
          open(os.path.join(OUT, "arseny_bust.json"), "w"))
print("frames", len(frames), "scale", round(scale, 3), "body", body.size, "bust", bust.size)
