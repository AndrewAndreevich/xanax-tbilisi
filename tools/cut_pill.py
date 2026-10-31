"""Cut the Xanax bar out of a product photo -> assets/xanax_bar.png (transparent, cropped).

The photo is a pale bar on a pale gradient; the bar's dark rim separates it. Mask =
pixels that differ from the per-row background, holes filled, largest blob kept,
then an elliptical-corner-friendly smooth edge.
usage: python tools/cut_pill.py <photo>
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

src = sys.argv[1]
out = os.path.join(os.path.dirname(__file__), "..", "assets", "xanax_bar.png")   # then resized to 480px wide -> xanax_bar.webp
img = Image.open(src).convert("RGB")
a = np.asarray(img).astype(np.int16)
lum = a.mean(2)
edges = np.concatenate([lum[:, :12], lum[:, -12:]], axis=1)
bg = np.median(edges, axis=1)[:, None]
# also a column model: the gradient runs left->right
bgc = np.median(np.concatenate([lum[:8], lum[-8:]], axis=0), axis=0)[None, :]
diff = np.minimum(np.abs(lum - bg), np.abs(lum - bgc))
mask = diff > 10
# The left of the photo fades into the bar's own tone, so a colour mask leaks there.
# The bar is a rounded rectangle: find its box from the clean edges and draw the
# shape instead. Top/bottom/right from the colour mask; left mirrored from the
# score lines' symmetry is overkill — the far-left dark rim is found on the middle rows.
strong = diff > 18
rows = np.nonzero(strong.sum(1) > strong.shape[1] * 0.35)[0]
y0, y1 = rows.min(), rows.max()
mid = strong[int(y0 + (y1 - y0) * 0.35):int(y0 + (y1 - y0) * 0.65)]
cols = np.nonzero(mid.mean(0) > 0.6)[0]
x0, x1 = cols.min(), cols.max()
H, W = lum.shape
yy, xx = np.mgrid[0:H, 0:W]
r = (y1 - y0) * 0.30                                  # corner radius
cx = np.clip(xx, x0 + r, x1 - r); cy = np.clip(yy, y0 + r, y1 - r)
mask = (xx - cx) ** 2 + (yy - cy) ** 2 <= r * r
mask &= (xx >= x0) & (xx <= x1) & (yy >= y0) & (yy <= y1)
print("box", x0, y0, x1, y1)
m = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
rgba = img.convert("RGBA"); rgba.putalpha(m)
rgba = rgba.crop(rgba.getbbox())
rgba.save(out)
print(out, rgba.size, "mask px", int(mask.sum()))
