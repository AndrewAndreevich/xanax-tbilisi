# The four crooked red crosses from the album cover, traced to SVG paths for slide 2.
# Each cross = a vertical and a horizontal bar. A bar is traced as its two edges sampled
# along its length (so the hand-drawn wobble stays); where the other bar crosses it the edges
# are interpolated. Two arms are hidden behind the tiger on the cover (top-left cross: right
# arm, top-right cross: left arm) — those are extended along their own edges to the length of
# the opposite arm, so all four are whole crosses.
# Writes assets/crosses.json: [{viewBox, d, w}] in the order TL, TR, BL, BR.
import json, sys
import numpy as np
from PIL import Image

SRC = "old/img/oad-3b2e36c5-e7a5-424f-94d1-870069c28de6.webp"
# box (x0, x1, y0, y1) and which arm end is hidden behind the tiger
CROSSES = [((150, 312, 292, 486), "right"), ((800, 1126, 264, 500), "left"),
           ((166, 504, 968, 1180), None), ((755, 1046, 877, 1107), None)]

a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
red = (a[..., 0] > 170) & (a[..., 1] < 130) & (a[..., 2] < 110)


def smooth(v, k=5):
    p = np.pad(v, k // 2, mode="edge")
    return np.convolve(p, np.ones(k) / k, mode="valid")


def bar_edges(M, band, other):
    """M: mask with the bar running along axis 1 (columns = position along the bar).
    band: (lo, hi) rows of the bar; other: (lo, hi) columns where the other bar crosses.
    Returns positions t and the two edges (lo, hi) along the bar."""
    lo_b, hi_b = band
    win = M[max(0, lo_b - 25): hi_b + 25]
    t, e0, e1 = [], [], []
    for x in range(M.shape[1]):
        col = np.nonzero(win[:, x])[0]
        if len(col) < 6:
            continue
        t.append(x); e0.append(col[0] + max(0, lo_b - 25)); e1.append(col[-1] + max(0, lo_b - 25))
    t, e0, e1 = map(np.array, (t, e0, e1))
    # inside the crossing the column is all red: interpolate the edges across it
    keep = (t < other[0] - 4) | (t > other[1] + 4)
    full = np.arange(t.min(), t.max() + 1)
    e0 = np.interp(full, t[keep], e0[keep]); e1 = np.interp(full, t[keep], e1[keep])
    return full.astype(float), smooth(e0), smooth(e1)


def extend(t, e0, e1, side, length):
    """extend the bar at one end along a line fitted to its last 40 px of edge"""
    n = 40
    if side == "end":
        tt = t[-n:]; f0 = np.polyfit(tt, e0[-n:], 1); f1 = np.polyfit(tt, e1[-n:], 1)
        nt = np.arange(t[-1] + 1, t[-1] + 1 + length)
        return (np.concatenate([t, nt]), np.concatenate([e0, np.polyval(f0, nt)]), np.concatenate([e1, np.polyval(f1, nt)]))
    tt = t[:n]; f0 = np.polyfit(tt, e0[:n], 1); f1 = np.polyfit(tt, e1[:n], 1)
    nt = np.arange(t[0] - length, t[0])
    return (np.concatenate([nt, t]), np.concatenate([np.polyval(f0, nt), e0]), np.concatenate([np.polyval(f1, nt), e1]))


def bands(M, axis):
    s = M.sum(axis=axis)
    idx = np.nonzero(s > 0.5 * s.max())[0]
    return idx.min(), idx.max()


out, hbars = [], []
for (x0, x1, y0, y1), hidden in CROSSES:
    M = red[y0:y1, x0:x1]
    vx = bands(M, 0)              # columns of the vertical bar
    hy = bands(M, 1)              # rows of the horizontal bar
    # horizontal bar: along x
    t, e0, e1 = bar_edges(M, hy, vx)
    cxv = (vx[0] + vx[1]) / 2
    if hidden == "right":
        want = cxv - t[0]                        # as long as the left arm
        t, e0, e1 = extend(t, e0, e1, "end", int(max(0, want - (t[-1] - cxv))))
    if hidden == "left":
        want = t[-1] - cxv
        t, e0, e1 = extend(t, e0, e1, "start", int(max(0, want - (cxv - t[0]))))
    hbars.append((t, e0, e1))
    H = [(x, y) for x, y in zip(t, e0)] + [(x, y + 1) for x, y in zip(t[::-1], e1[::-1])]
    # vertical bar: along y (transpose)
    t, e0, e1 = bar_edges(M.T, vx, hy)
    V = ([(y, x) for x, y in zip(t, e0)] + [(y + 1, x) for x, y in zip(t[::-1], e1[::-1])])[::-1]   # same winding as H, so the crossing stays filled
    polys = []
    for P in (H, V):
        P = P[::3]                                   # a point every 3 px is plenty
        polys.append("M" + " ".join(f"{x:.1f},{y:.1f}" for x, y in P) + "Z")
    pts = np.array(H + V)
    bx0, by0 = pts.min(0) - 1; bx1, by1 = pts.max(0) + 1
    out.append({"viewBox": f"{bx0:.0f} {by0:.0f} {bx1 - bx0:.0f} {by1 - by0:.0f}", "d": "".join(polys), "w": round(bx1 - bx0)})



# the big Georgian cross on slide 2 gets the same hand: each of its bars borrows the wobble of
# a traced bar (the edges' deviation from a straight bar, scaled to its thickness), plus a
# slight lean and slanted ends. Coordinates in % of the cross box, like its old CSS bars:
# vertical 43..57 x -30..100, horizontal 3..97 x 43..57.
def hand(src, length, width, lean, ends):
    t, e0, e1 = src
    w0 = np.mean(e1 - e0)
    u = (t - t[0]) / (t[-1] - t[0])
    mid = (e0 + e1) / 2
    fit = np.polyval(np.polyfit(u, mid, 1), u)
    d0 = (e0 - mid) / w0 * width - (-width / 2) + (mid - fit) / w0 * width    # edge offsets, bar units
    d1 = (e1 - mid) / w0 * width - (width / 2) + (mid - fit) / w0 * width
    d0, d1 = smooth(d0, 15), smooth(d1, 15)                  # scaled up 3x: soften the small steps
    s = np.linspace(0, 1, 60)
    a = np.interp(s, u, d0) - width / 2 + lean * (s - 0.5)
    b = np.interp(s, u, d1) + width / 2 + lean * (s - 0.5)
    pa = ends[0] + s * (length - ends[0] - ends[1])          # slanted ends: edge a starts/ends a bit off
    pb = ends[2] + s * (length - ends[2] - ends[3])
    return pa, a, pb, b

big = []
pa, a, pb, b = hand(hbars[2], 94, 14, -1.2, (0, 0.8, 1.1, 0))           # horizontal: from the bottom-left cross
big.append([(3 + x, 50 + y) for x, y in zip(pa, a)] + [(3 + x, 50 + y) for x, y in zip(pb[::-1], b[::-1])])
pa, a, pb, b = hand(hbars[3], 130, 14, 1.6, (1.4, 0, 0, 1.0))           # vertical: from the bottom-right cross
big.append(([(50 + y, -30 + x) for x, y in zip(pa, a)] + [(50 + y, -30 + x) for x, y in zip(pb[::-1], b[::-1])])[::-1])
big_d = "".join("M" + " ".join(f"{x:.2f},{y:.2f}" for x, y in P) + "Z" for P in big)
out.append({"viewBox": "0 0 100 100", "d": big_d, "w": 100, "big": True})

json.dump(out, open("assets/crosses.json", "w"), indent=0)
if len(sys.argv) > 1:   # preview sheet
    svg = "".join(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{c["viewBox"]}" width="{c["w"] * (4 if c.get("big") else 1)}" style="overflow:visible;margin:120px 40px"><path fill="#ff2a14" d="{c["d"]}"/></svg>' for c in out)
    open(sys.argv[1], "w").write(f"<html><body style='background:#f2f2f2;display:flex;gap:30px;align-items:center;padding:30px'>{svg}</body></html>")
print([c["viewBox"] for c in out])
