"""Rebuild the old band site (xnxtbs.com, Readymag project 3992439) as one static,
phone-friendly page: old/index.html + old/img/*.webp.

xnxtbs.com is gone and the Wayback capture only has the empty Readymag shell; the
project itself still answers on readymag.website. This pulls every page's widgets
from its viewer API, downloads the pictures, and lays each page out as a vertical
column in the order of its phone layout (pictures, texts with their links, the
video, slideshows). Navigation buttons are dropped — the page has its own nav.

usage: python tools/build_oldsite.py
"""

import html
import io
import json
import os
import re
import urllib.request

from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "old")
IMG = os.path.join(OUT, "img")
PROJECT = "https://readymag.website/u2167510307/3992439/"
API = "https://readymag.website/api/viewer/project/3992439/widgets?pageId={}"
UA = {"User-Agent": "Mozilla/5.0"}


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()


def pages_list():
    t = html.unescape(get(PROJECT).decode("utf-8", "ignore"))
    i = t.index('"pages":[') + len('"pages":')
    depth = 0
    for k in range(i, len(t)):
        depth += {"[": 1, "]": -1}.get(t[k], 0)
        if depth == 0:
            break
    pages = json.loads(t[i:k + 1])
    return sorted(pages, key=lambda p: p["num"])


def jl(v):
    return json.loads(v) if isinstance(v, str) else (v or {})


def phone(w):
    return jl(w.get("viewport_phone_portrait"))


def visible(w):
    # the phone layout decides when it says so (the video is hidden on desktop, shown on phones)
    ph = phone(w)
    return not ph["hidden"] if "hidden" in ph else not w.get("hidden")


def order_key(w):
    ph = phone(w)
    return (ph.get("y", w.get("y", 0)), ph.get("x", w.get("x", 0)))


saved = {}


def save_picture(url, max_w=1200):
    if url in saved:
        return saved[url]
    name = re.sub(r"[^a-z0-9-]", "", url.rsplit("/", 1)[-1].rsplit(".", 1)[0].lower())[-40:] + ".webp"
    path = os.path.join(IMG, name)
    if not os.path.exists(path):
        im = Image.open(io.BytesIO(get(url)))
        im = im.convert("RGBA") if im.mode in ("P", "LA", "RGBA") else im.convert("RGB")
        if im.width > max_w:
            im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
        im.save(path, quality=84, method=6)
    saved[url] = "img/" + name
    return saved[url]


def color(hex8):
    if not hex8:
        return None
    rgb, a = hex8[:6], (int(hex8[6:8], 16) / 100 if len(hex8) == 8 else 1)
    r, g, b = (int(rgb[i:i + 2], 16) for i in (0, 2, 4))
    return f"rgba({r},{g},{b},{min(1, a):.2f})"


def text_html(w):
    ph = phone(w)
    styles = ph.get("styles") or w.get("styles") or []
    metas = ph.get("blocksMeta") or w.get("blocksMeta") or []
    smap = {s["key"]: s for s in styles}
    mmap = {m["key"]: m.get("data", {}) for m in metas}
    ents = w.get("entityMap") or {}
    out = []
    for b in w.get("blocks", []):
        txt = b.get("text", "").replace("‍", "")
        if not txt.strip():
            out.append("<br>")
            continue
        st = smap.get(b["key"], {})
        vals = dict(zip(st.get("inlineStyles", {}).get("keys", []), st.get("inlineStyles", {}).get("values", [])))
        css = []
        if vals.get("FONT_SIZE"):
            css.append(f"font-size:{max(12, min(34, int(float(vals['FONT_SIZE']))))}px")
        if vals.get("FONT_WEIGHT"):
            css.append(f"font-weight:{vals['FONT_WEIGHT']}")
        if color(vals.get("COLOR")):
            css.append(f"color:{color(vals['COLOR'])}")
        align = mmap.get(b["key"], {}).get("align", "align-left").replace("align-", "")
        css.append(f"text-align:{'left' if align == 'justify' else align}")
        # links: entityRanges over the block text
        pieces, pos = [], 0
        for r in sorted(b.get("entityRanges", []), key=lambda r: r["offset"]):
            e = ents.get(str(r["key"])) if isinstance(ents, dict) else None
            url = (e or {}).get("data", {}).get("url")
            if not url:
                continue
            if not re.match(r"https?://", url):
                url = "https://" + url
            pieces.append(html.escape(txt[pos:r["offset"]]))
            pieces.append(f'<a href="{html.escape(url)}" target="_blank" rel="noopener">{html.escape(txt[r["offset"]:r["offset"] + r["length"]])}</a>')
            pos = r["offset"] + r["length"]
        pieces.append(html.escape(txt[pos:]))
        out.append(f'<p style="{";".join(css)}">{"".join(pieces)}</p>')
    return "\n".join(out)


def page_html(page, widgets):
    title = page.get("title") or f"PAGE {page['num']}"
    parts = []
    for w in sorted(widgets, key=order_key):
        t = w.get("type")
        if t in ("background", "shape", "button") or not visible(w):
            continue
        if t == "picture":
            pic = jl(phone(w).get("picture")) or jl(w.get("picture"))
            url = pic.get("unscaledUrl") or pic.get("url")
            if not url:
                continue
            src = save_picture(url)
            img = f'<img src="{src}" alt="" loading="lazy">'
            link = w.get("clickLink")
            parts.append(f'<a class="pic" href="{html.escape(link)}" target="_blank" rel="noopener">{img}</a>' if link else f'<div class="pic">{img}</div>')
        elif t == "text":
            body = text_html(w)
            if not re.sub(r"<br>|\s", "", body) and len(w.get("name", "")) > 40:
                # ABOUT keeps its copy only in the widget name (the text box itself is blank)
                body = "<p>" + html.escape(w["name"]).replace(". ", ".</p><p>") + "</p>"
            parts.append(f'<div class="txt">{body}</div>')
        elif t == "video":
            vid = w.get("video_id")
            parts.append(f'<div class="vid"><iframe src="https://www.youtube-nocookie.com/embed/{vid}" title="{html.escape(w.get("title", ""))}" '
                         f'allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>')
        elif t == "slideshow":
            for p in w.get("pictures", []):
                url = p.get("unscaledUrl") or p.get("url")
                if url:
                    parts.append(f'<div class="pic"><img src="{save_picture(url)}" alt="" loading="lazy"></div>')
    return f'<section id="{title.lower()}"><h2>{html.escape(title)}</h2>\n' + "\n".join(parts) + "\n</section>"


def main():
    os.makedirs(IMG, exist_ok=True)
    pages = pages_list()
    secs = []
    for p in pages:
        widgets = json.loads(get(API.format(p["_id"])))
        secs.append(page_html(p, widgets))
        print(p["num"], p.get("title"), len(widgets))
    nav = " ".join(f'<a href="#{(p.get("title") or "").lower()}">{html.escape(p.get("title") or "")}</a>' for p in pages)
    doc = TEMPLATE.replace("{{NAV}}", nav).replace("{{SECTIONS}}", "\n".join(secs))
    open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(doc)
    print("images", len(saved))


TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>XNXTBS — old site archive</title>
<meta name="description" content="Archived copy of xnxtbs.com, the Xanax Tbilisi virtual band site (Readymag, 2022–2023).">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Chakra+Petch:wght@700&display=swap" rel="stylesheet">
<style>
  :root { --red: #e8261e; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fff; color: #111; font: 400 16px/1.5 Inter, system-ui, sans-serif; }
  header { position: sticky; top: 0; z-index: 5; background: #fff; border-bottom: 1px solid #eee; padding: 10px 16px; }
  header h1 { font: 700 18px 'Chakra Petch', sans-serif; letter-spacing: .02em; }
  header h1 small { font: 400 11px Inter, sans-serif; color: #888; margin-left: 8px; }
  nav { display: flex; gap: 6px 14px; flex-wrap: wrap; margin-top: 6px; font-size: 12px; font-weight: 600; letter-spacing: .06em; }
  nav a { color: #111; text-decoration: none; }
  nav a:hover { color: var(--red); }
  main { max-width: 760px; margin: 0 auto; padding: 0 16px 60px; }
  section { padding-top: 34px; scroll-margin-top: 80px; }
  h2 { font: 700 13px 'Chakra Petch', sans-serif; letter-spacing: .12em; color: var(--red); border-top: 2px solid var(--red); padding-top: 8px; margin-bottom: 14px; }
  .pic { display: block; margin: 12px 0; }
  .pic img { display: block; width: 100%; height: auto; }
  a.pic { width: 64px; display: inline-block; margin: 6px 10px 6px 0; vertical-align: middle; }
  .txt { margin: 12px 0; }
  .txt p { margin: 0 0 4px; overflow-wrap: anywhere; }
  .txt a { color: var(--red); }
  .vid { position: relative; aspect-ratio: 16 / 9; margin: 12px 0; background: #000; }
  .vid iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
  footer { max-width: 760px; margin: 0 auto; padding: 0 16px 40px; font-size: 12px; color: #888; }
  footer a { color: #888; }
</style>
</head>
<body>
<header>
  <h1>XNXTBS <small>xnxtbs.com archive · virtual band</small></h1>
  <nav>{{NAV}}</nav>
</header>
<main>
{{SECTIONS}}
</main>
<footer>Copy of xnxtbs.com (Readymag project 3992439), rebuilt from the project data for viewing after the domain expired. <a href="../">← new site</a></footer>
</body>
</html>
"""

if __name__ == "__main__":
    main()
