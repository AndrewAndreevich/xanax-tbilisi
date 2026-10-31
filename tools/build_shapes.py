"""Placeholder impostors for the tracks that have no object yet: abstract shapes (signed
distance fields, ray-marched in numpy), 16 views on one ring, dithered to a few grey
tones. Same atlas format as prius / bottle: assets/shape_<name>.webp + .json.

usage: python tools/build_shapes.py [name ...]      (all shapes when none given)
"""

import json
import math
import os
import sys

import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
CELL, FRAMES, COLS, ROWS, PROFILE_ROWS = 256, 16, 8, 2, 64
SS = 2                                                # supersampling before the dither


def length(*a):
    return np.sqrt(sum(x * x for x in a))


def rot_x(p, a):
    x, y, z = p
    c, s = math.cos(a), math.sin(a)
    return x, c * y - s * z, s * y + c * z


def rot_z(p, a):
    x, y, z = p
    c, s = math.cos(a), math.sin(a)
    return c * x - s * y, s * x + c * y, z


def box(p, b, r=0.0):
    q = [np.abs(v) - (h - r) for v, h in zip(p, b)]
    out = length(*[np.maximum(v, 0) for v in q])
    return out + np.minimum(np.maximum(np.maximum(q[0], q[1]), q[2]), 0) - r


def torus(p, R, r):
    x, y, z = p
    return length(length(x, z) - R, y) - r


def sphere(p, r):
    return length(*p) - r


def cyl(p, r, h, axis=1):
    a = [0, 1, 2]
    a.remove(axis)
    d0 = length(p[a[0]], p[a[1]]) - r
    d1 = np.abs(p[axis]) - h
    return np.minimum(np.maximum(d0, d1), 0) + length(np.maximum(d0, 0), np.maximum(d1, 0))


def shift(p, dx=0, dy=0, dz=0):
    return p[0] - dx, p[1] - dy, p[2] - dz


# --- the shapes: f(p) -> distance, p = (x, y, z), y up, roughly inside the unit sphere
def s_torus(p):
    return torus(rot_x(p, 1.1), 0.58, 0.2)


def s_twist(p):
    x, y, z = p
    a = y * 1.6
    c, s = np.cos(a), np.sin(a)
    return box((c * x - s * z, y, s * x + c * z), (0.3, 0.85, 0.3), 0.04) * 0.7


def s_octa(p):
    x, y, z = p
    return (np.abs(x) + np.abs(y) * 0.8 + np.abs(z) - 0.8) * 0.57


def s_cross(p):
    v = box(p, (0.11, 0.88, 0.11), 0.02)
    h = box(shift(p, dy=0.28), (0.55, 0.11, 0.11), 0.02)
    ends = [box(shift(p, dx=sx * 0.55, dy=0.28), (0.04, 0.2, 0.13)) for sx in (-1, 1)]
    top = box(shift(p, dy=0.88), (0.2, 0.04, 0.13))
    return np.minimum.reduce([v, h, *ends, top])


def s_bar(p):
    q = rot_z(rot_x(p, 0.5), 0.35)
    d = box(q, (0.9, 0.17, 0.24), 0.12)
    for gx in (-0.45, 0.0, 0.45):
        d = np.maximum(d, -box(shift(q, dx=gx, dy=0.2), (0.025, 0.08, 0.3)))
    return d


def s_cone(p):
    x, y, z = p
    q = length(x, z)
    h, r = 1.7, 0.62
    y2 = y + 0.85
    d = np.maximum(q * (h / math.hypot(h, r)) + (y2 - h) * (r / math.hypot(h, r)), -y2)
    return d


def s_menger(p):
    d = box(p, (0.62, 0.62, 0.62))
    for a, b in ((0, 1), (1, 2), (0, 2)):
        h = [0.7, 0.7, 0.7]
        h[a] = h[b] = 0.22
        d = np.maximum(d, -box(p, h))
    return d


def s_rings(p):
    return np.minimum.reduce([torus(rot_x(p, a), 0.62 - i * 0.14, 0.06) for i, a in enumerate((0.3, 1.2, 2.1))])


def s_holes(p):
    d = sphere(p, 0.75)
    for ax in range(3):
        d = np.maximum(d, -cyl(p, 0.3, 2, ax))
    return d


def s_helix(p):
    x, y, z = p
    pitch, R = 0.55, 0.45
    ang = np.arctan2(z, x)
    v = y - ang / (2 * math.pi) * pitch
    v = np.mod(v + pitch / 2, pitch) - pitch / 2
    d = length(length(x, z) - R, v) * 0.6 - 0.11
    return np.maximum(d, np.abs(y) - 0.85)


def s_star(p):
    x, y, z = rot_x(p, 0.35)
    # 5-point star in the x/y plane, extruded along z
    a = np.arctan2(x, y)
    k = 2 * math.pi / 5
    a = np.mod(a + k / 2, k) - k / 2
    r = length(x, y)
    px, py = r * np.sin(np.abs(a)), r * np.cos(a)
    # edge from the tip (0, R) to the inner corner
    R, ri = 0.85, 0.36
    ix, iy = ri * math.sin(k / 2), ri * math.cos(k / 2)
    ex, ey = ix, iy - R
    t = np.clip((px * ex + (py - R) * ey) / (ex * ex + ey * ey), 0, 1)
    dd = length(px - ex * t, py - R - ey * t)
    sgn = np.sign(px * ey - (py - R) * ex)
    d2 = dd * -sgn
    dz = np.abs(z) - 0.16
    return np.minimum(np.maximum(d2, dz), 0) + length(np.maximum(d2, 0), np.maximum(dz, 0))


def s_tetra(p):
    x, y, z = rot_x(p, -0.62)
    md = np.maximum(np.maximum(-x - y - z, x + y - z), np.maximum(-x + y + z, x - y + z))
    return (md - 0.48) / math.sqrt(3)


def s_hourglass(p):
    x, y, z = p
    q = length(x, z)
    return np.maximum(q - (0.12 + np.abs(y) * 0.62), np.abs(y) - 0.85) * 0.75


def s_links(p):
    a = torus(rot_x(shift(p, dy=0.3), 0.2), 0.42, 0.11)
    b = torus(rot_x(rot_z(shift(p, dy=-0.3), 1.57), 1.57), 0.42, 0.11)
    return np.minimum(a, b)


def s_gem(p):
    x, y, z = p
    d = cyl(p, 0.72, 0.55)
    for i in range(8):
        a = i * math.pi / 4
        nx, nz = math.cos(a), math.sin(a)
        d = np.maximum(d, (x * nx + z * nz) * 0.8 + y * 0.6 - 0.48)
        d = np.maximum(d, (x * nx + z * nz) * 0.6 - y * 0.8 - 0.36)
    return d


SHAPES = {
    "torus": s_torus, "twist": s_twist, "octa": s_octa, "cross": s_cross, "bar": s_bar,
    "cone": s_cone, "menger": s_menger, "rings": s_rings, "holes": s_holes, "helix": s_helix,
    "star": s_star, "tetra": s_tetra, "hourglass": s_hourglass, "links": s_links, "gem": s_gem,
}

BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16


def render(f, turn, res):
    # orthographic camera on the ring, a little above (elevation 12°), looking at the origin
    u = (np.arange(res) + 0.5) / res * 2.2 - 1.1
    X, Y = np.meshgrid(u, -u)
    el = math.radians(12)
    # camera basis: rotate the ray origins/directions by elevation round x, then turn round y
    def to_world(v):
        x, y, z = v
        y, z = y * math.cos(el) - z * math.sin(el), y * math.sin(el) + z * math.cos(el)
        c, s = math.cos(turn), math.sin(turn)
        return np.stack([c * x + s * z, y, -s * x + c * z])
    o = to_world(np.stack([X.ravel(), Y.ravel(), np.full(X.size, -3.0)]))
    d = to_world(np.stack([np.zeros(X.size), np.zeros(X.size), np.ones(X.size)]))
    t = np.zeros(X.size)
    hit = np.zeros(X.size, bool)
    alive = np.ones(X.size, bool)
    for _ in range(140):
        idx = np.nonzero(alive)[0]
        if not len(idx):
            break
        p = o[:, idx] + d[:, idx] * t[idx]
        dist = f(tuple(p))
        t[idx] += dist * 0.9
        h = dist < 1e-3
        hit[idx[h]] = True
        alive[idx[h | (t[idx] > 6)]] = False
    p = o + d * t
    e = 2e-3
    n = np.stack([f(tuple(p + np.array(v)[:, None] * e)) - f(tuple(p - np.array(v)[:, None] * e))
                  for v in ((1, 0, 0), (0, 1, 0), (0, 0, 1))])
    n /= np.linalg.norm(n, axis=0) + 1e-9
    L = to_world(np.array([[-0.5], [0.7], [-0.6]]))[:, 0]
    L /= np.linalg.norm(L)
    lam = np.clip((n * L[:, None]).sum(0), 0, 1)
    rim = np.clip(1 + (n * d).sum(0), 0, 1) ** 3
    shade = 0.16 + 0.72 * lam + 0.35 * rim
    return np.where(hit, shade, 0).reshape(res, res), hit.reshape(res, res)


def build(name, f):
    atlas = Image.new("RGBA", (COLS * CELL, ROWS * CELL))
    frames = []
    for i in range(FRAMES):
        shade, hit = render(f, -2 * math.pi * i / FRAMES, CELL * SS)
        shade = shade.reshape(CELL, SS, CELL, SS).mean((1, 3))
        cov = hit.reshape(CELL, SS, CELL, SS).mean((1, 3))
        shade = np.where(cov > 0, shade / np.maximum(cov, 1e-6), 0)
        # ordered dither to 4 grey tones, like the rest of the site
        th = np.tile(BAYER, (CELL // 4, CELL // 4))
        lv = np.clip(np.floor(np.clip(shade, 0, 1) * 3 + th), 0, 3)
        g = np.array([38, 110, 190, 244])[lv.astype(int)]
        a = (cov > 0.5) * 255
        cell = Image.fromarray(np.dstack([g, g, g, a]).astype(np.uint8), "RGBA")
        atlas.paste(cell, ((i % COLS) * CELL, (i // COLS) * CELL))
        prof = []
        for k in range(PROFILE_ROWS):
            band = a[int(k * CELL / PROFILE_ROWS):int((k + 1) * CELL / PROFILE_ROWS)].max(0)
            xs = np.nonzero(band > 60)[0]
            prof.append([round(xs.min() / CELL, 3), round((xs.max() + 1) / CELL, 3)] if len(xs) else None)
        frames.append({"profile": prof})
    atlas.save(os.path.join(OUT, f"shape_{name}.webp"), quality=85, method=6)
    json.dump({"cols": COLS, "rows": ROWS, "cellW": CELL, "cellH": CELL, "frames": frames},
              open(os.path.join(OUT, f"shape_{name}.json"), "w"), separators=(",", ":"))
    print("shape", name)


for nm in sys.argv[1:] or SHAPES:
    build(nm, SHAPES[nm])
