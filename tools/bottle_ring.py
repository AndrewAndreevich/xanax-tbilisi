"""Blender: 3D stand-in of the J bottle (old xnxtbs NFT drawing), built from the drawing's
own measurements, rendered on one ring so the turn is right by construction; the AI pass
then redraws it to look like the drawing.

    blender -b -noaudio -P tools/bottle_ring.py -- <ref_geom.json> <out_dir> [views=8]

ref_geom.json (measured from the drawing): width per row, cap rows, where the yellow
starts, centre line and thickness of the black thing. The cap and the body are lathed from
those widths; the thing follows the drawing's centre line and thickness.
Writes <out_dir>/ring_NNN.png (bottle, white background) and thing_NNN.png (the black thing
alone, transparent) to be laid over it.
"""

import json
import math
import os
import sys

import bpy

argv = sys.argv[sys.argv.index("--") + 1:]
G = json.load(open(argv[0]))
OUT = argv[1]
VIEWS = int(argv[2]) if len(argv) > 2 else 8
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def flat(name, rgb, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*rgb, 1)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    if alpha < 1:
        tr = nt.nodes.new("ShaderNodeBsdfTransparent")
        mix = nt.nodes.new("ShaderNodeMixShader")
        mix.inputs["Fac"].default_value = alpha
        nt.links.new(tr.outputs[0], mix.inputs[1])
        nt.links.new(em.outputs[0], mix.inputs[2])
        nt.links.new(mix.outputs[0], out.inputs["Surface"])
        if hasattr(m, "surface_render_method"):
            m.surface_render_method = "BLENDED"
        else:
            m.blend_method = "BLEND"
    else:
        nt.links.new(em.outputs[0], out.inputs["Surface"])
    return m


def srgb(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


GREY, WHITE, BLACK, YELLOW = srgb("5f5f5f"), srgb("ffffff"), srgb("0a0a0a"), srgb("fbd22a")
root = bpy.data.objects.new("Bottle", None)
scene.collection.objects.link(root)

top, bot = G["top"], G["bot"]
S = 2.4 / (bot - top)                                 # px -> units, bottle 2.4 tall
z_of = lambda row: (bot - row) * S
prof = {r: (x0, x1) for r, x0, x1 in G["profile"]}
rows = sorted(prof)


def near(r):
    return prof[min(rows, key=lambda q: abs(q - r))]


def half(r):
    x0, x1 = near(r)
    return (x1 - x0) / 2 * S


def centre(r):
    x0, x1 = near(r)
    return (x0 + x1) / 2


def lathe(name, pts, mat):
    seg = 72
    verts, faces = [], []
    for rad, z in pts:
        for s in range(seg):
            a = 2 * math.pi * s / seg
            verts.append((rad * math.cos(a), rad * math.sin(a), z))
    for i in range(len(pts) - 1):
        for s in range(seg):
            a, b = i * seg + s, i * seg + (s + 1) % seg
            faces.append((a, b, b + seg, a + seg))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    ob.parent = root
    return ob


cap_top, cap_bot, liq = G["cap_top"], G["cap_bot"], G["liquid_top"]
cap_pts = [(0.001, z_of(cap_top))] + [(half(r), z_of(r)) for r in rows if cap_top < r < cap_bot] + [(0.001, z_of(cap_bot))]
lathe("Cap", cap_pts, flat("cap", GREY))
body_rows = [r for r in rows if cap_bot - 30 <= r <= bot]
body_pts = [(0.001, z_of(cap_bot - 30))] + [(half(r), z_of(r)) for r in body_rows] + [(0.001, z_of(bot))]
lathe("Glass", body_pts, flat("glass", WHITE, alpha=0.3))     # white like the paper
liq_rows = [r for r in rows if liq <= r <= bot - 4]
liq_pts = [(0.001, z_of(liq))] + [(half(r) * 0.96, z_of(r)) for r in liq_rows] + [(0.001, z_of(bot - 4))]
lathe("Liquid", liq_pts, flat("liquid", YELLOW, alpha=0.75))

# the J on the front of the cap (front = -Y)
jr = (cap_top + cap_bot) / 2
bpy.ops.object.text_add(location=(0, -half(jr) - 0.01, z_of(jr)), rotation=(math.pi / 2, 0, 0))
j = bpy.context.active_object
j.data.body = "J"
j.data.size = half(jr) * 0.75
j.data.extrude = 0.01
j.data.align_x = "CENTER"
j.data.align_y = "CENTER"
j.data.materials.append(flat("j", WHITE))
j.parent = root

# the black thing: the drawing's centre line (offset from the body centre) and thickness
cu = bpy.data.curves.new("Thing", "CURVE")
cu.dimensions = "3D"
cu.bevel_depth = 1.0
cu.bevel_resolution = 6
cu.use_fill_caps = True
sp = cu.splines.new("POLY")
th = [t for t in G["thing"] if t[2] > 4]
th = th[::max(1, len(th) // 24)]
sp.points.add(len(th) - 1)
for p, (r, cx, w) in zip(sp.points, th):
    p.co = ((cx - centre(r)) * S, 0, z_of(r), 1)
    p.radius = max(0.3, w / 2) * S * 0.95
cu.materials.append(flat("thing", BLACK))
thing = bpy.data.objects.new("Thing", cu)
scene.collection.objects.link(thing)
thing.parent = root

cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam"))
scene.collection.objects.link(cam)
cam.data.type = "ORTHO"
cam.data.ortho_scale = 2.4 * 1.12
cam.location = (0, -10, 1.2)
cam.rotation_euler = (math.pi / 2, 0, 0)
scene.camera = cam
for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
    try:
        scene.render.engine = eng
        break
    except TypeError:
        continue
scene.render.resolution_x, scene.render.resolution_y = 512, 1024
scene.world = bpy.data.worlds.new("W")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[0].default_value = (1, 1, 1, 1)
scene.view_settings.view_transform = "Standard"
scene.render.use_freestyle = True
scene.render.line_thickness_mode = "ABSOLUTE"
fs = scene.view_layers[0].freestyle_settings
ls = fs.linesets[0] if fs.linesets else fs.linesets.new("L")
ls.select_by_visibility = True
ls.visibility = "VISIBLE"
ls.select_silhouette = ls.select_border = True
if ls.linestyle is None:
    ls.linestyle = bpy.data.linestyles.new("Ink")
ls.linestyle.color = (0, 0, 0)
ls.linestyle.thickness = 4.0

# two passes per view: the bottle without the thing, then the thing alone on a transparent
# film. The thing is seen whole through the clear bottle from any side, so it is laid over
# afterwards — solid black like in the drawing instead of greyed by glass and liquid.
others = [o for o in scene.objects if o.parent is root and o is not thing]
for v in range(VIEWS):
    root.rotation_euler = (0, 0, -2 * math.pi * v / VIEWS)   # J goes off to the left first
    thing.hide_render = True
    scene.render.film_transparent = False
    scene.render.filepath = os.path.join(OUT, f"ring_{v:03d}.png")
    bpy.ops.render.render(write_still=True)
    thing.hide_render = False
    for o in others:
        o.hide_render = True
    scene.render.film_transparent = True
    scene.render.filepath = os.path.join(OUT, f"thing_{v:03d}.png")
    bpy.ops.render.render(write_still=True)
    for o in others:
        o.hide_render = False
print("RENDERED", VIEWS)
