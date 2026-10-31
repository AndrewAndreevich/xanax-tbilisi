import * as THREE from "three";
import { FIRE_GLSL, createEdgeFire } from "./fire.js?v=47";

// ---------------------------------------------------------------- content
const TRACKS = [
  ["EUROORGASM", "02:50"], ["RADIO KABUL", "02:07"], ["VLADIMIR PUTIN IS DEAD", "04:04"],
  ["CHINA GARDEN", "00:36"], ["NATURAL DEMOCRAT", "01:34"], ["STALIN MOUSTACHE", "01:30"],
  ["DYING SWAN", "02:38"], ["RUSSIANS GO HOME", "02:12"], ["S. L. O. N.", "02:23"],
  ["MORDOR CALLING", "00:28"], ["OCCUPAN VACATION", "01:14"], ["300 ARAGVELI", "00:26"],
  ["WHERE I'VE BEEN LAST 8 YEARS", "02:46"], ["XNX TBS", "00:48"], ["CRYPTO ACAB", "02:40"],
  ["COMRADE IN TRAGEDY", "02:24"], ["RADIO PYONGYANG", "00:34"],
];
const ROLES = ["ARSENY THE BAPTIST", "SONIC DEATH", "PADLA BEAR OUTFIT", "XANAX TBILISI", "SELF-BLAMING", "SELF-HELP", "SELFMADE"];
const TAGS = ["ALTERNATIVE", "CHILLWAVE", "LO-FI", "POST-PUNK", "SELF-BLAMING", "SELF-HELP", "SELFMADE", "SELFPRODUCED", "TBILISI"];

// "*" marks a red line; [..] marks an inverted word
const CASE = `CASE FILE: ARSENY THE BAPTIST
SUBJECT: ARSENY MOROZOV.
ALSO KNOWN AS ARSENIJ KRESTITEL. ALSO KNOWN AS PADLA BEAR OUTFIT. ALSO KNOWN AS SONIC DEATH.
TOO MANY NAMES FOR ONE PASSPORT.
LATE FEBRUARY 2022. A NEW FLAT. FRESHLY RENOVATED.
THEY LIVED IN IT FOR THREE DAYS.
THEN THE BAND DECIDED. TOGETHER. LEAVE.
YEREVAN FIRST. NO ROOMS LEFT.
THEN [TBILISI].
A COLD WINTER. ONE HOUSE. FIFTEEN STRANGERS.
BACK HOME THEY SAID IT IN KITCHENS.
HERE IT WAS WRITTEN ON THE WALLS.
*RUSSIANS GO HOME.
HE READ IT.
HE DID NOT ARGUE.
APRIL 2022. AN ARTIST. A GAME DESIGNER. A SINGER WITH A TRANSLATOR TAB OPEN.
TWENTY SONGS IN A LANGUAGE THAT WAS NOT HIS.
THAT WAS THE POINT.
NOBODY HAD TO UNDERSTAND THE ACCENT.
ONLY THE GUILT.
SELF-BLAMING. SELF-HELP. SELFMADE.
THE SQUARE IN FRONT OF PARLIAMENT, SCANNED POINT BY POINT.
THE WALLS, PHOTOGRAPHED WORD BY WORD.
A BAND THAT EXISTS ONLY ONLINE.
A CITY THAT EXISTS ONLY AS A COPY.
A FIRST CONCERT IN [VRCHAT].
NO TICKETS. NO VENUE. NO PASSPORT CONTROL.
THE BIRD ON THE PASSPORT IS ALWAYS HUNGRY.
HE STOPPED FEEDING IT.
HE STOPPED MAKING NICE MUSIC FOR NICE PEOPLE.
INDIE WITHOUT FANGS DID NOT SURVIVE THE WAR.
WHAT WAS LEFT WAS FAST. LO-FI. SHORT. ANGRY.
TWENTY-EIGHT SECONDS OF MORDOR CALLING.
TWENTY-SIX SECONDS OF 300 ARAGVELI.
THIRTY-ONE MINUTES IN TOTAL.
SEVENTEEN TRACKS. 6.66 EUROS OR MORE.
*HE WILL NOT PLAY IN RUSSIA.
HE KNOWS WHY THE LOCAL SCENE KEPT THE DOOR SHUT.
HE DOES NOT KNOCK.
TBILISI IS NOT A HIDING PLACE.
TBILISI IS A MIRROR.
XANAX IS NOT A CURE.
IT IS A NAME FOR THE NUMBNESS.
THE NEXT RECORD SHOULD BE IN [ქართული].
FOREVER IN THE HEART.
HE DOES NOT MAKE SONGS TO BE LIKED.
*HE MAKES THEM TO BE ON THE RECORD.`.split("\n");

const V = "47";                                       // bump with index.html ?v= on every deploy (Pages caches 10 min)
const asset = (p) => `${p}?v=${V}`;
const isMobile = () => innerWidth <= 820;
const $ = (s) => document.querySelector(s);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// ---------------------------------------------------------------- DOM fill
$("#roles").innerHTML = [...ROLES, ...ROLES].map((r) => `<span>${r}</span>`).join("");
// tracks that open a track view: the band's SoundCloud + the impostor that spins in it
// (the six album tracks that are only on Bandcamp do not play here).
// shape_* are abstract placeholders (tools/build_shapes.py) until each track gets its object.
const scUrl = (slug) => `https://soundcloud.com/xanaxtbilisi/${slug}`;
const PLAYABLE = {
  "EUROORGASM": { sc: scUrl("euroorgasm"), impostor: "shape_star", size: 0.8 },
  "RADIO KABUL": { sc: scUrl("radio-kabul"), impostor: "shape_rings", size: 0.9 },
  "VLADIMIR PUTIN IS DEAD": { sc: scUrl("putin-is-dead"), impostor: "shape_cross", size: 0.8 },
  "NATURAL DEMOCRAT": { sc: scUrl("natural-democrat"), impostor: "shape_holes", size: 0.8 },
  "DYING SWAN": { sc: scUrl("the-dying-swan"), impostor: "shape_twist", size: 0.8 },
  "RUSSIANS GO HOME": { sc: scUrl("russians-go-home"), impostor: "shape_cone", size: 0.8 },
  "S. L. O. N.": { sc: scUrl("slon"), impostor: "shape_menger", size: 0.8 },
  "XNX TBS": { sc: scUrl("xnx-tbs"), impostor: "shape_bar", size: 0.8 },
  "CRYPTO ACAB": { sc: scUrl("crypto-acab"), impostor: "shape_gem", size: 0.9 },
  // times: when each lyric line starts (s); record them with ?sync on the site
  "STALIN MOUSTACHE": { sc: "https://soundcloud.com/xanaxtbilisi/stalin-moustache", impostor: "prius", times: null },
  // only the acoustic version is on the band's SoundCloud
  "WHERE I'VE BEEN LAST 8 YEARS": { sc: "https://soundcloud.com/xanaxtbilisi/where-ive-been-last-8-years-acoustic", impostor: "bottle", size: 0.5, times: null },
};
// the HUD playlist (shown in player mode): the playable tracks in album order
const PLAY_LIST = TRACKS.filter(([t]) => PLAYABLE[t]);
$("#tracks").innerHTML = PLAY_LIST.map(([t, d], i) => `<li data-t="${t}" tabindex="0" role="button"><span>${String(i + 1).padStart(2, "0")} ${t}</span><span>${d}</span></li>`).join("");
{
  const sec = PLAY_LIST.reduce((a, [, d]) => a + d.split(":").reduce((m, x) => m * 60 + +x, 0), 0);
  $(".total").innerHTML = `<span>[${PLAY_LIST.length}]</span><span>${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}</span>`;
}
$("#exitTracks").innerHTML = TRACKS.map(([t, d], i) =>
  `<div class="tr${PLAYABLE[t] ? " playable" : ""}" data-t="${t}"><span>${String(i + 1).padStart(2, "0")} ${t}</span><b>${d}</b></div>`).join("");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
// one sentence per line, alternating sides of the figure
const SENT = CASE.flatMap((line) => {
  const red = line.startsWith("*");
  return (red ? line.slice(1) : line).split(/(?<=\.) (?=\S)/).map((t) => (red ? "*" : "") + t);
});
$("#case").innerHTML = SENT.map((line, i) => {
  const red = line.startsWith("*");
  const txt = esc(red ? line.slice(1) : line).replace(/\[(.+?)\]/g, '<span class="g">$1</span>');
  return `<p class="${i % 2 ? "R" : "L"}${red ? " hit" : ""}">${txt}</p>`;
}).join("");

// scramble each line in as it enters the viewport
const GLYPH = "0123456789#/\\+-X";
function scramble(el) {
  const nodes = [];
  const walk = (n) => n.nodeType === 3 ? nodes.push([n, n.textContent]) : n.childNodes.forEach(walk);
  walk(el);
  let f = 0;
  const step = () => {
    f++;
    let busy = false;
    for (const [n, src] of nodes) {
      n.textContent = [...src].map((c, k) => {
        if (c === " " || k < f * 3) return c;
        busy = true;
        return GLYPH[(Math.random() * GLYPH.length) | 0];
      }).join("");
    }
    if (busy) setTimeout(step, 28);
  };
  step();
}
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { scramble(e.target); io.unobserve(e.target); }
}), { rootMargin: "0px 0px -8% 0px" });
document.querySelectorAll(".case p").forEach((p) => io.observe(p));

// ---------------------------------------------------------------- slide-2 glyphs
const G = [
  { x: 37, y: 32, cls: "mir", t: "GO HOME\nPLEASE" },
  { x: 47, y: 30, cls: "flip", t: TAGS.join("\n") },
  { x: 40, y: 41, cls: "", t: "+995" },
  { x: 58, y: 42, cls: "mir", t: "N/A #" },
  { x: 47, y: 60, cls: "flip", t: "XNX TBS" },
  { x: 60, y: 60, cls: "", t: "300 ARAGVELI" },
  { x: 33, y: 60, cls: "mir", t: "MORDOR CALLING" },
  { x: 54, y: 70, cls: "", t: "41.6977 N\n44.7987 E" },
  { x: 66, y: 22, cls: "", t: "//" },
];
$("#glyphs").innerHTML = G.map((g) => `<span class="gl ${g.cls}" style="left:${g.x}%;top:${g.y}%">${g.t}</span>`).join("")
  + `<span class="gl barcode" style="left:44%;top:72%"></span>`
  + `<span class="gl bx" style="left:52%;top:50%">✚</span>`
  + `<span class="gl bx" style="left:51%;top:84%">✚</span>`;

// ---------------------------------------------------------------- fire on the slide-2 edge
// Fire lab variant A at max (height 0.8, strength 1.6): white-grey flames growing out
// of the white slide with no seam. Same shader family and palette as the burning figure.
const fireCv = $("#fire");
const edgeFire = createEdgeFire(fireCv, { variant: 0, strength: 1.6, maxDpr: 1 });
let fireReach = 0;                                   // flame height above the white, css px — drives the figure's burn
function sizeFire() {
  if (!edgeFire) return;
  edgeFire.resize();
  const over = innerHeight * 0.12;                   // the canvas reaches 12vh down into the white slide (see .fire)
  edgeFire.state.edge = over;
  edgeFire.state.flame = innerHeight * 0.72 * 0.8;   // lab panel is 72vh, height slider at 0.8
  fireReach = edgeFire.state.flame * 0.5;            // where the tongues mostly stand (variant A at strength 1.6)
}

// ---------------------------------------------------------------- dithered terrain
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y) => { let s = 0, a = 0.5; for (let i = 0; i < 5; i++) { s += a * vnoise(x, y); x *= 2; y *= 2; a *= 0.5; } return s; };

function drawTerrain(cv, color, seed, gain) {
  const r = cv.getBoundingClientRect();
  const cell = 3, w = Math.ceil(r.width / cell), h = Math.ceil(r.height / cell);
  cv.width = w * cell; cv.height = h * cell;
  const ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = color;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = x / 90 + seed, ny = y / 45;
      const ridge = fbm(nx * 0.6, seed) * h * 0.7;            // mountain silhouette
      const inside = y > h - ridge - h * 0.25 ? 1 : 0;
      let v = fbm(nx * 1.4, ny * 1.4 + seed) * inside * (y / h) * gain;
      if (v > BAYER[(y & 3) * 4 + (x & 3)]) ctx.fillRect(x * cell, y * cell, 2, 2);
    }
  }
}

// ---------------------------------------------------------------- impostor figure (char01 ring16)
// 16 views round one ring (assets/arseny_body.*, built by tools/build_impostor.py).
// The quad shows one frame at a time, picked by scroll; the look (ordered
// dither, RGB split, glitch bands, the burn from the feet up) is all in the fragment shader.
const VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */`
  uniform sampler2D uAtlas;
  uniform vec2 uGrid;
  uniform float uA, uB, uMix, uTime, uGlitch, uSplit, uPix, uFront;
  varying vec2 vUv;
  ${FIRE_GLSL}
  vec4 cell(float f, vec2 uv) {
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
    float c = mod(f, uGrid.x), r = floor(f / uGrid.x);
    return texture2D(uAtlas, vec2((c + uv.x) / uGrid.x, 1.0 - (r + 1.0 - uv.y) / uGrid.y));
  }
  vec4 view(vec2 uv) { return mix(cell(uA, uv), cell(uB, uv), uMix); }
  void main() {
    vec2 uv = vUv;
    float band = floor(uv.y * 70.0);
    float g = step(0.94, fract(sin(band * 91.7 + floor(uTime * 10.0)) * 4375.85)) * uGlitch;
    uv.x += g * (fract(sin(band * 13.1) * 917.3) - 0.5) * 0.25;
    vec2 px = floor(gl_FragCoord.xy / uPix);
    float t = bayer4(gl_FragCoord.xy / uPix);
    vec4 cr = view(uv + vec2(uSplit, 0.0));
    vec4 cg = view(uv);
    vec4 cb = view(uv - vec2(uSplit, 0.0));
    float a = max(cg.a, max(cr.a, cb.a));

    // burn front = where the edge fire's tongues are on screen, in uv (0 = feet, 1 = head)
    float n = noise(vec2(uv.x * 14.0, uv.y * 22.0 - uTime * 4.0));
    float n2 = noise(vec2(uv.x * 30.0 + 7.0, uv.y * 9.0 - uTime * 6.5));
    float front = uFront;
    float d = front - uv.y + (n - 0.5) * 0.14;          // > 0: already burnt
    if (front > -0.3) {
      // flame tongues: silhouette pixels just below this point, licking upward
      float lick = 0.03 + 0.09 * n2;
      float below = view(uv - vec2((n - 0.5) * 0.02, lick)).a;
      bool flame = d > -0.09 && d < 0.05 && (a > 0.25 || below > 0.25);
      if (d >= 0.05) {                                  // charred: sparse embers only
        float e = hash(px + floor(uTime * 9.0));
        if (a > 0.4 && e > 0.93) { gl_FragColor = vec4(firePal(0.2 + 0.5 * e), 1.0); return; }
        discard;
      }
      if (flame) {
        float h = clamp(1.0 - abs(d + 0.01) / 0.08, 0.0, 1.0) * (0.55 + 0.6 * n2);
        h = floor(h * 5.0 + t) / 5.0;                   // stepped, dithered heat
        if (h <= 0.0) discard;
        gl_FragColor = vec4(firePal(h), 1.0);
        return;
      }
    }

    if (a < t * 0.9 + 0.05) discard;
    vec3 c = vec3(cr.r, cg.g, cb.b);
    float l = dot(cg.rgb, vec3(0.299, 0.587, 0.114));
    l = clamp((l - 0.04) * 1.5, 0.0, 1.0);
    float q = floor(l * 3.0 + t) / 3.0;                       // 4 dithered tones
    vec3 col = mix(vec3(q), c * 1.25, 0.32);
    // glow above the front: the body heats up red before it catches
    float heat = front > -0.3 ? smoothstep(-0.25, -0.05, d) : 0.0;
    col = mix(col, vec3(1.0, 0.1, 0.05) * (0.4 + q), heat * 0.7);
    col *= 0.82 + 0.18 * step(0.5, fract(gl_FragCoord.y / (uPix * 2.0)));   // scanlines
    gl_FragColor = vec4(col, 1.0);
  }`;

const canvas = $("#stage");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -1, 1);   // pixel space, y down via negative
const figMat = new THREE.ShaderMaterial({
  vertexShader: VERT, fragmentShader: FRAG, transparent: true,
  uniforms: {
    uAtlas: { value: null }, uGrid: { value: new THREE.Vector2(8, 2) },
    uA: { value: 0 }, uB: { value: 1 }, uMix: { value: 0 }, uTime: { value: 0 },
    uGlitch: { value: 0 }, uSplit: { value: 0.004 }, uPix: { value: 2 }, uFront: { value: -1 },
  },
});
const figQuad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), figMat);
scene.add(figQuad);

let BODY = null;                                     // atlas json: grid + silhouette profiles
const fig = { x: 0, y: 0, w: 0, h: 0 };              // figure rect on screen, css px

function layoutFigure() {
  if (!BODY) return;
  fig.h = innerHeight * (isMobile() ? 0.66 : 0.74);
  fig.w = fig.h * BODY.cellW / BODY.cellH;
  fig.x = innerWidth / 2 - fig.w / 2;
  fig.y = innerHeight * (isMobile() ? 0.5 : 0.48) - fig.h / 2;
  figQuad.scale.set(fig.w, fig.h, 1);
  figQuad.position.set(fig.x + fig.w / 2, -(fig.y + fig.h / 2), 0);
}

// silhouette edges at a screen y, from the nearest frame, widened a few rows for air
function edges(frame, y) {
  if (!BODY) return null;
  const prof = BODY.frames[frame].profile, n = prof.length;
  const r = Math.floor((y - fig.y) / fig.h * n);
  let l = 1, rr = 0;
  for (let k = r - 3; k <= r + 3; k++) {
    const p = prof[k];
    if (p) { l = Math.min(l, p[0]); rr = Math.max(rr, p[1]); }
  }
  if (l > rr) return null;
  return [fig.x + l * fig.w, fig.x + rr * fig.w];
}

// ---------------------------------------------------------------- case-file text flowing round the silhouette
const lines = [...document.querySelectorAll(".case p")].map((el) => ({ el, side: el.classList.contains("L") ? -1 : 1, y0: 0, w: 0, h: 0, x: null }));
let streamH = 0;
function measureLines() {
  const lh = isMobile() ? 13 : 14;
  const y = { "-1": 0, 1: lh * 0.5 };                 // right stream sits half a line lower
  for (const ln of lines) {
    ln.w = ln.el.offsetWidth; ln.h = ln.el.offsetHeight;
    ln.y0 = y[ln.side];
    y[ln.side] += ln.h + (isMobile() ? 3 : 4);
  }
  streamH = Math.max(y[-1], y[1]);
}

let p1s = 0, panelW = 0;
function flowText(frame) {
  const gap = isMobile() ? 6 : 10, gut = isMobile() ? 4 : panelW + 8;
  const travel = p1s * (streamH + innerHeight * 1.05);
  const cx = innerWidth / 2;
  for (const ln of lines) {
    const y = innerHeight * 0.98 + ln.y0 - travel;
    if (y < -40 || y > innerHeight + 10) { ln.el.style.visibility = "hidden"; ln.x = null; continue; }
    ln.el.style.visibility = "visible";
    const e = edges(frame, y + ln.h / 2) || [cx - 4, cx + 4];
    let tx = ln.side < 0 ? e[0] - gap - ln.w : e[1] + gap;
    tx = ln.side < 0 ? Math.max(tx, gut) : Math.min(tx, innerWidth - gut - ln.w);
    ln.x = ln.x == null ? tx : ln.x + (tx - ln.x) * 0.3;
    ln.el.style.transform = `translate3d(${ln.x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  }
}

// ---------------------------------------------------------------- HUD corner: map of Georgia
// Georgia's outline (Natural Earth 1:10m, assets/georgia.json) as a dot screen, a scan line
// sweeping across it and Tbilisi blinking red at the crosshair.
const miniCv = $("#miniFig"), miniCtx = miniCv.getContext("2d");
let geo = null, geoDots = null, geoPath = null, geoBox = null;
fetch(asset("assets/georgia.json")).then((r) => r.json()).then((j) => (geo = j)).catch(() => {});
function drawMini(t) {
  if (!geo || !miniCv.clientWidth) return;
  const dpr = Math.min(devicePixelRatio, 2), W = miniCv.clientWidth, H = miniCv.clientHeight;
  if (miniCv.width !== Math.round(W * dpr)) {
    miniCv.width = Math.round(W * dpr); miniCv.height = Math.round(H * dpr);
    const w = Math.min(W - 16, (H - 12) / geo.aspect), h = w * geo.aspect;
    geoBox = { x: (W - w) / 2, y: (H - h) / 2, w };
    geoPath = new Path2D();
    geo.ring.forEach(([x, y], i) => geoPath[i ? "lineTo" : "moveTo"](geoBox.x + x * w, geoBox.y + y * w));
    geoPath.closePath();
    geoDots = [];
    const probe = document.createElement("canvas").getContext("2d");
    for (let y = 1.5; y < H; y += 3) for (let x = 1.5 + (Math.round(y / 3) % 2) * 1.5; x < W; x += 3)
      if (probe.isPointInPath(geoPath, x, y)) geoDots.push(x, y);
  }
  const g = miniCtx, { x: bx, y: by, w } = geoBox;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  const scan = bx + ((t * 0.18) % 1.2 - 0.1) * w;               // a scan line passing west to east
  for (let i = 0; i < geoDots.length; i += 2) {
    const x = geoDots[i], y = geoDots[i + 1], near = Math.max(0, 1 - Math.abs(x - scan) / 18);
    g.fillStyle = `rgba(255,255,255,${0.32 + near * 0.68})`;
    g.fillRect(x - 0.6, y - 0.6, 1.2, 1.2);
  }
  g.strokeStyle = "#fff"; g.lineWidth = 1;
  g.stroke(geoPath);
  const tx = bx + geo.tbilisi[0] * w, ty = by + geo.tbilisi[1] * w;
  g.strokeStyle = "rgba(255,255,255,.35)";
  g.setLineDash([2, 3]);
  g.beginPath(); g.moveTo(0, ty + 0.5); g.lineTo(W, ty + 0.5); g.moveTo(tx + 0.5, 0); g.lineTo(tx + 0.5, H); g.stroke();
  g.setLineDash([]);
  const on = Math.floor(t * 2) % 2 === 0;
  g.fillStyle = on ? "#ff0a0a" : "#fff";
  g.fillRect(tx - 2.5, ty - 2.5, 5, 5);
  g.strokeStyle = "#ff0a0a";
  g.strokeRect(tx - 5.5, ty - 5.5, 11, 11);
  g.fillStyle = "#fff"; g.font = "700 8px 'IBM Plex Mono', monospace";
  g.fillText("TBS", tx + 9, ty - 4);
}

// ---------------------------------------------------------------- slide-2 head: bust impostor, dithered to ink
const headCv = $("#head"), headCtx = headCv.getContext("2d", { willReadFrequently: true });
const HEAD_RES = 400;
headCv.width = headCv.height = HEAD_RES;
let bustImg = null, bustMeta = null, headFrame = -1;
const headCache = new Map();
function drawHead(f) {
  if (!bustImg || f === headFrame) return;
  headFrame = f;
  if (!headCache.has(f)) {
    const off = document.createElement("canvas");
    off.width = off.height = HEAD_RES;
    const o = off.getContext("2d", { willReadFrequently: true });
    const c = bustMeta.cell, col = f % bustMeta.cols, row = Math.floor(f / bustMeta.cols);
    o.drawImage(bustImg, col * c, row * c, c, c, 0, 0, HEAD_RES, HEAD_RES);
    const img = o.getImageData(0, 0, HEAD_RES, HEAD_RES), d = img.data;
    const TONES = [[14, 14, 14], [118, 118, 118], [236, 236, 236]];
    for (let y = 0; y < HEAD_RES; y++) for (let x = 0; x < HEAD_RES; x++) {
      const i = (y * HEAD_RES + x) * 4;
      if (d[i + 3] < 128) { d[i + 3] = 0; continue; }
      let l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      l = clamp((l - 0.06) * 1.45);
      const q = Math.min(2, Math.floor(l * 2 + BAYER[(y & 3) * 4 + (x & 3)]));
      [d[i], d[i + 1], d[i + 2]] = TONES[q]; d[i + 3] = 255;
    }
    headCache.set(f, img);
  }
  headCtx.putImageData(headCache.get(f), 0, 0);
}
// head turns away and back while the cross rotates
// the head keeps turning on its own (one turn every HEAD_TURN s, frames in order); scrolling
// through slide 2 adds one more turn on top
const HEAD_TURN = 8;
let headP2 = 0;

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.left = 0; camera.right = w; camera.top = 0; camera.bottom = -h;
  camera.updateProjectionMatrix();
  figMat.uniforms.uPix.value = (isMobile() ? 1.5 : 2) * renderer.getPixelRatio();
  layoutFigure();
  measureLines();
  panelW = $(".panel.left").offsetWidth;
  drawTerrain($("#terrainDark"), "#2b2b2b", 3.1, 1.25);
  drawTerrain($("#terrainLight"), "#bdbdbd", 7.7, 1.5);
  sizeFire();
  sizePills();
}
addEventListener("resize", resize);

// ---------------------------------------------------------------- input / HUD
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener("pointermove", (e) => {
  mouse.tx = e.clientX / innerWidth * 2 - 1;
  mouse.ty = e.clientY / innerHeight * 2 - 1;
  $("#mx").textContent = String(Math.round(e.clientX / innerWidth * 999)).padStart(3, "0");
  $("#my").textContent = String(Math.round(e.clientY / innerHeight * 999)).padStart(3, "0");
});
const clockFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tbilisi", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const tickClock = () => ($("#clock").textContent = clockFmt.format(new Date()));
tickClock(); setInterval(tickClock, 1000);

const trackEls = [...document.querySelectorAll("#tracks li")];
const s1 = $("#s1"), s2 = $("#s2"), cross = $("#cross"), bignum = $("#bignum"), lion = $("#lion");
const NUMS = ["2022", "+995", "6.66", "0300"];
let p1 = 0, lastTrack = -1, glitchT = 0;
let spin = 0, spinS = 0;

function onScroll() {
  document.body.classList.toggle("scrolled", scrollY > innerHeight * 0.3);
  const r1 = s1.getBoundingClientRect();
  p1 = clamp(-r1.top / (r1.height - innerHeight));
  $("#progBar").style.setProperty("--p", p1);
  const ti = Math.min(TRACKS.length - 1, Math.floor(p1 * TRACKS.length));
  if (ti !== lastTrack) { lastTrack = ti; glitchT = 0.35; }   // the figure glitches as the page moves on

  // turn until slide 2 has fully covered the figure
  const cover = s2.offsetTop;                                  // scrollY at which slide 2 fills the screen
  spin = clamp(scrollY / cover);
  const r2 = s2.getBoundingClientRect();
  const p2 = clamp(-r2.top / (r2.height - innerHeight));
  const enter = clamp(1 - r2.top / innerHeight);              // 0 → 1 while slide 2 rises
  cross.style.setProperty("--rot", `${-28 * p2}deg`);
  cross.style.setProperty("--sc", 0.85 + 0.15 * enter + 0.12 * p2);
  cross.style.setProperty("--mx", clamp((p2 - 0.3) * 3));
  headCv.style.setProperty("--hy", `${(1 - enter) * 22}vh`);
  lion.style.setProperty("--ly", `${(1 - enter) * 14 - p2 * 8}vh`);
  headP2 = p2;
  bignum.textContent = NUMS[Math.min(NUMS.length - 1, Math.floor(p2 * NUMS.length))];
  canvas.style.visibility = r2.top > 0 ? "visible" : "hidden";
  $("#terrainDark").style.visibility = canvas.style.visibility;
}
addEventListener("scroll", onScroll, { passive: true });

// ---------------------------------------------------------------- audio player
// The track tries to start on load; browsers block sound until the first
// click / tap / key, so in that case it starts on the first one of those.
const audio = $("#track"), player = $("#player");
const plBtn = $("#plBtn"), plState = $("#plState"), plTime = $("#plTime"), plMute = $("#plMute"), barPlay = $("#barPlay");
const VIZ_N = 32;
$("#plViz").innerHTML = "<i></i>".repeat(VIZ_N);
const vizBars = [...document.querySelectorAll("#plViz i")];
const mmss = (t) => isFinite(t) ? `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}` : "00:00";
let actx = null, analyser = null, freq = null, userPaused = false, vol = 1;

// The analyser reroutes the element through an AudioContext, which starts
// suspended outside a user gesture — so it is only built from a gesture.
const TOUCH = matchMedia("(pointer: coarse)").matches;
function ensureAnalyser() {
  if (TOUCH) return;                                 // iOS mutes AudioContext output with the ringer switch; play the element directly
  if (analyser) { if (actx.state === "suspended") actx.resume(); return; }
  try {
    const ctx = actx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaElementSource(audio);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    src.connect(analyser); analyser.connect(ctx.destination);
    freq = new Uint8Array(analyser.frequencyBinCount);
    if (ctx.state === "suspended") ctx.resume();
  } catch { analyser = null; }
}
function play(gesture) {
  if (gesture) ensureAnalyser();
  return audio.play().then(() => true, () => false);
}
// ext: an outside source (the SoundCloud track in the track view). While it is set the
// HUD player — title, play/pause, progress, seek, volume — drives it instead of the site track.
let ext = null;
const plTitleIn = $(".pl-title-in"), SITE_TITLE = plTitleIn.innerHTML, barLabel = barPlay.lastChild;
function setPlayerTitle(a, b) {
  plTitleIn.innerHTML = a ? [a, b, a, b].map((x) => `<span>${x}</span>`).join("") : SITE_TITLE;
  barLabel.textContent = a ? "" : " SILENCE IN MOTION";      // in the player the stage bar names the track
}
function syncUI() {
  const on = ext ? !ext.paused : !audio.paused;
  plBtn.textContent = on ? "PAUSE" : "PLAY";
  barPlay.querySelector("b").textContent = on ? "PAUSE" : "PLAY";
  player.classList.toggle("paused", !on);
  plState.textContent = on ? "ON AIR" : (userPaused ? "PAUSED" : "CLICK TO PLAY");
  plState.classList.toggle("wait", !on && !userPaused);
}
function toggle() {
  if (ext) { ext.paused ? ext.play() : ext.pause(); return; }
  if (audio.paused) { userPaused = false; play(true).then(syncUI); }
  else { userPaused = true; audio.pause(); }
}
plBtn.addEventListener("click", toggle);
barPlay.addEventListener("click", toggle);
plMute.addEventListener("click", () => {
  vol = vol > 0.5 ? 0.5 : vol > 0 ? 0 : 1;                  // 100 → 50 → 0 → 100
  audio.volume = vol;
  if (ext) ext.volume(vol);
  plMute.textContent = `VOL ${String(Math.round(vol * 100)).padStart(3, "0")}`;
});
// waveform progress: peaks of whatever plays (site track: precomputed; SoundCloud: its waveform)
let sitePeaks = null;
fetch(asset("assets/audio/silence_in_motion.peaks.json")).then((r) => r.json()).then((p) => (sitePeaks = p)).catch(() => {});
const waveCvs = [$("#plBar"), $("#waveStrip")];
function drawWaves() {
  const peaks = ext ? tv.peaks : sitePeaks;
  const prog = ext ? tv.progress || 0 : (audio.duration ? audio.currentTime / audio.duration : 0);
  const dpr = Math.min(devicePixelRatio, 2);
  for (const cv of waveCvs) {
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) continue;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const step = 3, n = Math.floor(w / step);
    for (let i = 0; i < n; i++) {
      const pk = peaks ? peaks[Math.floor(i / n * peaks.length)] : 0.15;
      const bh = Math.max(1, pk * h);
      g.fillStyle = i / n < prog ? "#ff0a0a" : "#ffffff";
      g.fillRect(i * step, h - bh, step - 1, bh);
    }
  }
}
// scrub: press and drag along the waveform (or, in the track view, up/down on the stage);
// the position — and with it the lyrics — follows the finger, the player catches up
let scrub = null;
function scrubTo(k, commit) {
  k = clamp(k);
  if (ext) {
    tv.progress = k; tv.pos = k * tv.dur; tv.scrubbing = !commit;
    const now = performance.now();
    if (commit || now - (scrub?.last || 0) > 160) { ext.seek(k); if (scrub) scrub.last = now; }
  } else if (isFinite(audio.duration)) audio.currentTime = k * audio.duration;
}
waveCvs.forEach((cv) => {
  const at = (e) => { const r = cv.getBoundingClientRect(); return (e.clientX - r.left) / r.width; };
  cv.addEventListener("pointerdown", (e) => { scrub = { last: 0 }; cv.setPointerCapture(e.pointerId); scrubTo(at(e)); e.preventDefault(); });
  cv.addEventListener("pointermove", (e) => { if (scrub) scrubTo(at(e)); });
  const end = (e) => { if (scrub) { scrubTo(at(e), true); scrub = null; } };
  cv.addEventListener("pointerup", end);
  cv.addEventListener("pointercancel", end);
});
["play", "pause"].forEach((ev) => audio.addEventListener(ev, syncUI));
audio.addEventListener("timeupdate", () => {
  if (ext) return;
  plTime.textContent = `${mmss(audio.currentTime)} / ${mmss(audio.duration)}`;
  $("#plBar").style.setProperty("--t", audio.duration ? audio.currentTime / audio.duration : 0);
});
// first gesture anywhere starts the track, unless that gesture is on the player's own buttons
const kick = (e) => {
  if (e.target.closest?.(".pl-btn, .bar-play")) return;
  if (!userPaused) play(true).then(syncUI);
  ["pointerdown", "keydown", "touchstart"].forEach((t) => removeEventListener(t, kick, true));
};
["pointerdown", "keydown", "touchstart"].forEach((t) => addEventListener(t, kick, true));

function vizFrame() {
  const extOn = ext && !ext.paused;
  if (extOn) {                                       // SoundCloud gives no samples: the lively fake meter
    const t = tv.pos;
    vizBars.forEach((b, i) => b.style.transform = `scaleY(${Math.max(0.04, 0.5 + 0.45 * Math.sin(t * (3 + i * 0.37) + i) * Math.sin(t * 1.7 + i * 0.5))})`);
  } else if (!ext && analyser && !audio.paused) {
    analyser.getByteFrequencyData(freq);
    for (let i = 0; i < VIZ_N; i++) vizBars[i].style.transform = `scaleY(${Math.max(0.04, freq[i + 2] / 255)})`;
  } else if (!ext && !audio.paused) {                // no analyser (touch): a fake but lively meter
    const t = audio.currentTime;
    vizBars.forEach((b, i) => b.style.transform = `scaleY(${Math.max(0.04, 0.5 + 0.45 * Math.sin(t * (3 + i * 0.37) + i) * Math.sin(t * 1.7 + i * 0.5))})`);
  } else {
    for (const b of vizBars) b.style.transform = "scaleY(.04)";
  }
  drawWaves();
  requestAnimationFrame(vizFrame);
}
vizFrame();

$("#enter").addEventListener("click", () => {
  userPaused = false;
  play(true).then(syncUI);
  $("#loader").classList.add("done");
});

// ---------------------------------------------------------------- slide 3: Xanax bars pattern
// A staggered field of 2 mg bars (photo, assets/xanax_bar.webp), all at one angle,
// drifting. On a desktop the mouse steers the drift (no motion sensors: no iOS permission prompt).
const pillCv = $("#pills"), pillCtx = pillCv.getContext("2d");
let pillImg = null;
const tilt = { x: 0, y: 0, tx: 0, ty: 0 };              // -1..1, smoothed
let pillDX = 0, pillDY = 0;
addEventListener("pointermove", (e) => {
  if (e.pointerType === "touch") return;
  tilt.tx = e.clientX / innerWidth * 2 - 1;
  tilt.ty = e.clientY / innerHeight * 2 - 1;
});
const PILL_ANGLE = -0.32;                               // every bar at the same slant
function drawPills(dt) {
  if (!pillImg) return;
  const dpr = pillCv.width / Math.max(1, pillCv.clientWidth);
  const w = pillCv.width, h = pillCv.height;
  tilt.x += (tilt.tx - tilt.x) * Math.min(1, dt * 4);
  tilt.y += (tilt.ty - tilt.y) * Math.min(1, dt * 4);
  pillDX += (2 + tilt.x * 14) * dt * dpr;               // a very slow drift, gently steered by tilt
  pillDY += (5 + tilt.y * 14) * dt * dpr;
  pillCtx.clearRect(0, 0, w, h);
  const pw = 96 * dpr, ph = pw * pillImg.height / pillImg.width;
  const sx = 150 * dpr, sy = 74 * dpr;                  // grid step
  const ox = ((pillDX % sx) + sx) % sx, oy = ((pillDY % sy) + sy) % sy;
  for (let gy = -sy + oy, row = 0; gy < h + sy; gy += sy, row++) {
    const rr = Math.round((gy - pillDY) / sy);
    const stag = rr & 1 ? sx / 2 : 0;
    for (let gx = -sx + ox + stag; gx < w + sx; gx += sx) {
      pillCtx.save();
      pillCtx.translate(gx, gy);
      pillCtx.rotate(PILL_ANGLE);
      pillCtx.drawImage(pillImg, -pw / 2, -ph / 2, pw, ph);
      pillCtx.restore();
    }
  }
}

// the cloud bank on the seam between slide 2 and 3, dithered to paper / greys like the rest of
// the site. Each layer is a cumulus: a flat base with a billowing top of domes of very different
// sizes, its outline roughened by noise. Flat fill, lit from above: only the underside goes
// grey. The front layer covers the seam (rising a little over Arseny's torso); three layers
// behind it sit higher, greyer, drift slower and lag behind the page when it scrolls (parallax).
// Drawn small (one cell = CLOUD_PX css px) and scaled up pixelated.
const cloudCv = $("#clouds"), cloudCtx = cloudCv.getContext("2d");
const CLOUD_PX = 3;
let cloudImg = null, cloudT = -1;
// domes along a strip that repeats every span (units of the canvas height)
function cloudLayer(seed, o) {
  const L = [];
  let x = 0;
  for (let i = 0; x < 9 || i < 6; i++) {
    const k = hash(i + seed * 17, 1);
    const r = o.r * (0.4 + (o.big || 1.4) * k * k);          // mostly small, now and then a big one
    L.push({ x, r, dy: (hash(i, seed + 2) - 0.5) * o.r * 0.6 });
    x += r * (0.8 + 0.5 * hash(i + seed, 9));
  }
  return { ...o, L, span: x };
}
// y: the layer's base line (part of the canvas height, 0.5 = on the seam); top / base: how far
// the body reaches above / below it; speed in cells/s; para: lag when scrolling;
// tones: deep shadow, shadow, body
const CLOUD_LAYERS = [
  cloudLayer(4, { y: 0.4, r: 0.085, top: 0.02, base: 0.02, big: 1.8, speed: 0.35, para: 0.32, tones: [[40, 40, 40], [62, 62, 62], [96, 96, 96]] }),
  cloudLayer(3, { y: 0.45, r: 0.09, top: 0.02, base: 0.025, speed: 0.6, para: 0.22, tones: [[52, 52, 52], [92, 92, 92], [140, 140, 140]] }),
  cloudLayer(2, { y: 0.5, r: 0.1, top: 0.02, base: 0.03, speed: 0.95, para: 0.12, tones: [[64, 64, 64], [128, 128, 128], [190, 190, 190]] }),
  cloudLayer(1, { y: 0.58, r: 0.12, top: 0.03, base: 0.05, big: 1.6, speed: 1.5, para: 0, tones: [[90, 90, 90], [176, 176, 176], [242, 242, 242]] }),
];
function drawClouds(t) {
  const W = Math.ceil(cloudCv.clientWidth / CLOUD_PX), H = Math.ceil(cloudCv.clientHeight / CLOUD_PX);
  if (!W || !H || t - cloudT < 1 / 24) return;          // 24 fps is plenty for a slow drift
  cloudT = t;
  if (cloudCv.width !== W || cloudCv.height !== H) { cloudCv.width = W; cloudCv.height = H; cloudImg = cloudCtx.createImageData(W, H); }
  const d = cloudImg.data;
  // where the seam (slide 3's top) is inside the canvas: --up over --up + --down
  const cs = getComputedStyle(cloudCv.parentElement);
  const up = parseFloat(cs.getPropertyValue("--up")), down = parseFloat(cs.getPropertyValue("--down"));
  const seam = up / (up + down);
  const rc = cloudCv.getBoundingClientRect();
  const off = (rc.top + rc.height / 2 - innerHeight / 2) / innerHeight;   // scroll parallax
  // this frame's layers in cells, front first
  const layers = CLOUD_LAYERS.map((Lr) => {
    const base = (Lr.y + seam - 0.5 - off * Lr.para) * H, sp = Lr.span * H, shift = t * Lr.speed * 3, domes = [];
    const top = base - (Lr.top + Lr.base) * H;
    for (const p of Lr.L) {
      const r = p.r * H, cx = (((p.x * H + shift) % sp) + sp) % sp - 2 * Lr.r * H;
      for (const o2 of [-sp, 0, sp]) if (cx + o2 + r > -4 && cx + o2 - r < W + 4) domes.push([cx + o2, top + p.dy * H + r * 0.15 - (r - Lr.r * H) * 0.9, r]);   // big domes stand taller
    }
    const r = Lr.r * H;
    return { top, bot: base + Lr.base * H, domes, amp: r * 0.3, nf: 1 / (r * 0.55), shade: r * 0.45, seed: Lr.speed * 13, shift, tones: Lr.tones };
  }).reverse();
  // signed distance to a layer's outline (cells, < 0 inside), roughened by noise near the edge
  const dist = (l, col, x, y) => {
    let v = Math.max(y - l.bot, l.top - y);
    for (const [cx, cy, r] of col) { const q = Math.hypot(x - cx, y - cy) - r; if (q < v) v = q; }
    if (Math.abs(v) > l.amp * 1.2) return v;
    return v + (fbm((x - l.shift) * l.nf + l.seed, y * l.nf, 3) - 0.5) * 2 * l.amp;
  };
  for (let x = 0; x < W; x++) {
    const cols = layers.map((l) => l.domes.filter((c) => Math.abs(c[0] - x) < c[2] + 2));
    for (let y = 0; y < H; y++) {
      const i = (y * W + x) * 4;
      let c = null;
      for (let k = 0; k < layers.length && !c; k++) {
        const l = layers[k];
        if (y > l.bot + l.amp * 1.3) continue;
        const v = dist(l, cols[k], x, y);
        if (v > 0) continue;
        // lit from above: the body is flat; the underside (close to the outline below) goes grey
        const below = dist(l, cols[k], x, y + l.shade), below2 = dist(l, cols[k], x, y + l.shade * 0.4);
        const th = BAYER[(y % 4) * 4 + (x % 4)];
        if (below2 > 0) c = th < 0.7 ? l.tones[0] : l.tones[1];
        else if (below > 0) c = th < 0.55 ? l.tones[1] : l.tones[2];
        else c = v > -1 && th < 0.3 ? l.tones[1] : l.tones[2];
      }
      if (c) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; } else d[i + 3] = 0;
    }
  }
  cloudCtx.putImageData(cloudImg, 0, 0);
}
function sizePills() {
  const r = pillCv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 2);
  pillCv.width = Math.max(1, Math.round(r.width * dpr));
  pillCv.height = Math.max(1, Math.round(r.height * dpr));
}

// ---------------------------------------------------------------- track view (slide 3)
// Clicking a playable track opens a black stage right under it: the impostor turns
// on one ring, the track plays through the band's SoundCloud widget, and the lyrics
// (the track's description on SoundCloud, fetched live) flow round the car's
// silhouette in step with playback. BACK folds it away.
const tv = { el: null, row: null, cv: null, ctx: null, lyr: null, lines: [], streamH: 0, widget: null,
  progress: 0, pos: 0, dur: 0, img: null, meta: null, rect: { x: 0, y: 0, w: 0, h: 0 }, resume: false,
  title: "", times: null, syncing: false, tapTimes: [], appear0: 0, busy: false, peaks: null,
  scrubbing: false, Ys: null, prevYs: null, wob: 0, lastT: 0, leaving: false, leave0: 0 };
const SYNC = new URLSearchParams(location.search).has("sync");
const timesKey = (t) => `xt-times:${t}`;
const savedTimes = (t) => { try { return JSON.parse(localStorage.getItem(timesKey(t))); } catch { return null; } };
let scApi = null;
const loadScApi = () => scApi || (scApi = new Promise((ok, err) => {
  const sc = document.createElement("script");
  sc.src = "https://w.soundcloud.com/player/api.js";
  sc.onload = () => ok(window.SC); sc.onerror = err;
  document.head.appendChild(sc);
}));
// fetched while the page is idle, so a click on a track only waits for the widget itself
setTimeout(() => loadScApi().catch(() => { scApi = null; }), 3000);
const impostors = {};
const loadImpostor = (name) => impostors[name] || (impostors[name] = Promise.all([
  fetch(asset(`assets/${name}.json`)).then((r) => r.json()),
  img(asset(`assets/${name}.webp`)),
]));

const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
function animateScroll(to, ms) {
  return new Promise((done) => {
    const from = scrollY, t0 = performance.now();
    const step = () => {
      const k = clamp((performance.now() - t0) / ms);
      scrollTo({ top: from + (to - from) * ease(k), behavior: "instant" });
      k < 1 ? requestAnimationFrame(step) : done();
    };
    step();
  });
}
// keep the stage's middle at the middle of the screen while it grows or shrinks,
// so it opens from (and folds back into) the line under the track
// (until the stage has really reached its size: a slow device may stretch the transition)
function holdCentre(el, opening) {
  return new Promise((done) => {
    const t0 = performance.now();
    const step = () => {
      const top = scrollY + el.getBoundingClientRect().top;
      scrollTo({ top: top + el.offsetHeight / 2 - innerHeight / 2, behavior: "instant" });
      const h = el.offsetHeight, settled = opening ? h >= innerHeight - 1 : h <= 0;
      (settled && performance.now() - t0 > 300) || performance.now() - t0 > 4000 ? done() : requestAnimationFrame(step);
    };
    step();
  });
}

async function closeTrack() {
  if (!tv.el || tv.leaving) return;
  tv.leaving = true;
  const { el, row } = tv;
  try { tv.widget && tv.widget.pause(); } catch {}
  // the car drives off into the distance first (the entrance played backwards),
  // the lyrics fade with it — only then does the stage fold away
  tv.leave0 = performance.now();
  await new Promise((r) => setTimeout(r, 1300));
  tv.el = null; tv.token = null; tv.leaving = false; tv.leave0 = 0;
  ext = null;
  markTrack(null);
  setPlayerTitle(null);
  plTime.textContent = `${mmss(audio.currentTime)} / ${mmss(audio.duration)}`;
  $("#plBar").style.setProperty("--t", audio.duration ? audio.currentTime / audio.duration : 0);
  syncUI();
  $("#s3").classList.add("tv-room");
  el.classList.remove("open");
  row.classList.remove("on");
  await holdCentre(el, false);
  el.remove();
  $("#s3").classList.remove("tv-room");
  document.body.classList.remove("tv-mode");                // the page scrolls again
  if (tv.resume) { userPaused = false; play(true).then(syncUI); }
}

// track order for PREV / NEXT and autoplay: the album order, stopping at both ends
const trackRows = () => [...document.querySelectorAll("#exitTracks .tr.playable")];
let autoNext = true;
try { autoNext = localStorage.getItem("xt-auto") !== "0"; } catch {}
function stepTrack(d) {
  const rows = trackRows(), i = rows.indexOf(tv.row), next = rows[i + d];
  if (tv.el && !tv.busy && !tv.leaving && next) openTrack(next);
}
function trackEnded() {
  if (ext) { ext.paused = true; syncUI(); }
  if (autoNext) stepTrack(1);
}
// the track that is open, marked in the tracks slide and in the HUD list
function markTrack(title) {
  document.querySelectorAll("#exitTracks .tr.on").forEach((r) => r.classList.remove("on"));
  trackEls.forEach((li) => li.classList.toggle("on", li.dataset.t === title));
  if (title) document.querySelector(`#exitTracks .tr[data-t="${CSS.escape(title)}"]`)?.classList.add("on");
}

async function openTrack(row) {
  if (tv.busy || tv.leaving || (tv.el && tv.row === row)) return;
  if (tv.el) return switchTrack(row);
  tv.busy = true;
  document.body.classList.add("tv-mode");                   // player mode: the HUD playlist shows, the page stops scrolling
  const el = document.createElement("div");
  el.className = "tv";
  el.innerHTML = `<div class="tv-bar"><button class="pl-btn tv-back" type="button">&#9664; BACK</button>
    <span class="tv-title"></span>
    <span class="tv-nav"><button class="pl-btn tv-prev" type="button" aria-label="previous track">&#9664;&#9664;</button><button class="pl-btn tv-auto" type="button"></button><button class="pl-btn tv-next" type="button" aria-label="next track">&#9654;&#9654;</button></span>
    </div>
    <canvas></canvas><div class="tv-lyrics"></div>`;
  row.after(el);
  Object.assign(tv, { el, cv: el.querySelector("canvas"), lyr: el.querySelector(".tv-lyrics") });
  tv.ctx = tv.cv.getContext("2d");
  el.querySelector(".tv-back").addEventListener("click", () => closeTrack());
  el.querySelector(".tv-prev").addEventListener("click", () => stepTrack(-1));
  el.querySelector(".tv-next").addEventListener("click", () => stepTrack(1));
  const autoBtn = el.querySelector(".tv-auto");
  const showAuto = () => { autoBtn.textContent = `AUTO ${autoNext ? "ON" : "OFF"}`; autoBtn.classList.toggle("on", autoNext); };
  showAuto();
  autoBtn.addEventListener("click", () => {
    autoNext = !autoNext; showAuto();
    try { localStorage.setItem("xt-auto", autoNext ? "1" : "0"); } catch {}
  });
  if (SYNC) {
    const box = document.createElement("div");
    box.className = "tv-sync";
    box.textContent = "SYNC: TAP / SPACE AT THE START OF EACH LINE";
    el.appendChild(box);
    el.addEventListener("pointerdown", (e) => { if (!e.target.closest("button, iframe, textarea")) tapLine(); });
  }
  if (!SYNC) {
    // drag the lyrics up or down: the track follows (down = later, the text falls with time)
    let drag = null;
    el.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      drag = { y: e.clientY, k: tv.progress };
      scrub = { last: 0 };
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointermove", (e) => {
      if (!drag || !ext) return;
      scrubTo(drag.k + (e.clientY - drag.y) / (tv.streamH + (tv.band ? tv.band[1] - tv.band[0] : tv.cv.clientHeight)));
    });
    const end = () => { if (drag) { drag = null; scrubTo(tv.progress, true); scrub = null; } };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }
  // one player: the site track steps aside, the HUD now drives the open track
  tv.resume = !audio.paused;
  if (!audio.paused) audio.pause();
  setupTrack(row);

  // 1. bring the line under the track to the middle of the screen,
  // 2. open the stage from that line to the full screen, keeping it centred,
  // 3. the car drives in from far away (see tvTick: appear0)
  $("#s3").classList.add("tv-room");
  const line = scrollY + row.getBoundingClientRect().bottom;
  await animateScroll(line - innerHeight / 2, 520);
  void el.offsetHeight;                                     // commit height 0 first, so the opening animates
  el.classList.add("open");
  await holdCentre(el, true);
  $("#s3").classList.remove("tv-room");
  tv.appear0 = performance.now();
  tv.busy = false;
  startTrack(row);
}

// next / previous / autoplay while the stage is open: it stays open — only the object drives
// off, the stage moves under the new row (the screen does not move) and the next object
// drives in with its own sound and lyrics
async function switchTrack(row) {
  tv.busy = true;
  try { tv.widget && tv.widget.pause(); } catch {}
  tv.token = null;                                          // the old track's widget events stop counting
  tv.leave0 = performance.now();
  await new Promise((r) => setTimeout(r, 1300));
  const el = tv.el, before = el.getBoundingClientRect().top;
  row.after(el);
  scrollTo({ top: scrollY + el.getBoundingClientRect().top - before, behavior: "instant" });
  setupTrack(row);
  tv.busy = false;
  startTrack(row);
}

// the track's own parts of the stage: title, buttons, players, lyrics, the HUD player
function setupTrack(row) {
  const el = tv.el, title = row.dataset.t, cfg = PLAYABLE[title];
  el.querySelectorAll("iframe").forEach((f) => f.remove());
  el.querySelector(".tv-title").textContent = title;
  el.insertAdjacentHTML("beforeend", `<iframe class="sc" allow="autoplay" title="${title} on SoundCloud" tabindex="-1"
    src="https://w.soundcloud.com/player/?url=${encodeURIComponent(cfg.sc)}&auto_play=true&show_user=false&show_artwork=false&visual=false"></iframe>`);
  tv.lyr.innerHTML = "";
  tv.ctx.setTransform(1, 0, 0, 1, 0, 0);
  tv.ctx.clearRect(0, 0, tv.cv.width, tv.cv.height);
  markTrack(title);
  Object.assign(tv, { row, token: {}, lines: [], streamH: 0, progress: 0, pos: 0, dur: 0, widget: null, img: null, meta: null,
    title, times: cfg.times || savedTimes(title), syncing: SYNC, tapTimes: [], appear0: 0, peaks: null,
    scrubbing: false, Ys: null, prevYs: null, wob: 0, lastT: 0, leaving: false, leave0: 0, size: cfg.size || 1, vis: null, band: null });
  const rows = trackRows(), idx = rows.indexOf(row);
  el.querySelector(".tv-prev").disabled = idx <= 0;
  el.querySelector(".tv-next").disabled = idx >= rows.length - 1;
  ext = { paused: true, play() { tv.widget?.play(); }, pause() { tv.widget?.pause(); },
    seek(k) { tv.widget?.seekTo(k * tv.dur * 1000); }, volume(v) { tv.widget?.setVolume(v * 100); } };
  setPlayerTitle(title, "XANAX TBILISI");
  plTime.textContent = "00:00 / 00:00";
  $("#plBar").style.setProperty("--t", 0);
  syncUI();
  loadImpostor(cfg.impostor);                               // start fetching while the stage opens / the old one leaves
  const token = tv.token;
  loadScApi().then(() => bindWidget(token)).catch(() => null);
}

// once the object is loaded: it drives in, the lyrics and the SoundCloud widget start
async function startTrack(row) {
  const token = tv.token, title = row.dataset.t, cfg = PLAYABLE[title];
  const [meta, im] = await loadImpostor(cfg.impostor);
  if (tv.token !== token) return;
  tv.meta = meta; tv.img = im;
  // the rows the object really fills over its whole turn (the cell has empty margins)
  const rows = meta.frames.flatMap((f) => f.profile.map((p, i) => (p ? i : -1))).filter((i) => i >= 0), nr = meta.frames[0].profile.length;
  tv.vis = rows.length ? [Math.min(...rows) / nr, (Math.max(...rows) + 1) / nr] : [0, 1];
  if (!tv.appear0) tv.appear0 = performance.now();
  if (ext && ext.paused) tv.widget?.play();                 // in case the widget was ready before it was bound
  // lyrics: the track's description on SoundCloud
  const fallback = [title, "XANAX TBILISI", "2022"];
  fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(cfg.sc)}`)
    .then((r) => r.json())
    .then((j) => {
      if (tv.token !== token) return;
      const text = (j.description || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      buildLyrics(text.length ? text : fallback);
    })
    .catch(() => tv.token === token && buildLyrics(fallback));
}

// the SoundCloud widget is bound as soon as its iframe exists, so its READY is never missed
// (it used to be bound only after the object had loaded — by then the widget was often
// ready already and the track never started); it plays the moment it is ready
function bindWidget(token) {
  if (tv.token !== token || !window.SC) return;
  const w = tv.widget = SC.Widget(tv.el.querySelector("iframe.sc"));
  w.bind(SC.Widget.Events.READY, () => {
    if (tv.token !== token) return;
    w.setVolume(vol * 100); w.play(); w.getDuration((d) => (tv.dur = d / 1000));
    w.getCurrentSound((snd) => {
      const u = snd && snd.waveform_url && snd.waveform_url.replace(/\.png$/, ".json");
      if (u) fetch(u).then((r) => r.json()).then((j) => {
        const m = Math.max(1, ...j.samples);
        if (tv.token === token) tv.peaks = j.samples.map((v) => v / m);
      }).catch(() => {});
    });
  });
  w.bind(SC.Widget.Events.PLAY, () => { if (ext && tv.token === token) { ext.paused = false; syncUI(); } });
  w.bind(SC.Widget.Events.PAUSE, () => { if (ext && tv.token === token) { ext.paused = true; syncUI(); } });
  w.bind(SC.Widget.Events.FINISH, () => { if (tv.token === token) trackEnded(); });
  w.bind(SC.Widget.Events.PLAY_PROGRESS, (e) => {
    if (tv.scrubbing || tv.token !== token) return;
    tv.progress = e.relativePosition;
    tv.pos = e.currentPosition / 1000;
    if (ext) {
      plTime.textContent = `${mmss(tv.pos)} / ${mmss(tv.dur)}`;
      $("#plBar").style.setProperty("--t", tv.progress);
    }
  });
}

function buildLyrics(lines) {
  tv.lyr.innerHTML = lines.map((l, i) =>
    `<p class="${i % 2 ? "R" : "L"}">${[...l].map((c) => `<span>${esc(c)}</span>`).join("")}</p>`).join("");
  const lh = isMobile() ? 12 : 14, y = { L: 0, R: lh * 0.5 };
  tv.lines = [...tv.lyr.querySelectorAll("p")].map((p) => {
    const side = p.classList.contains("L") ? "L" : "R";
    // letter offsets measured once in normal flow, then every letter is placed by hand
    const chars = [...p.children].map((el) => ({ el, x: el.offsetLeft, w: el.offsetWidth }));
    const ln = { p, side, chars, w: p.offsetWidth, h: p.offsetHeight, y0: y[side], x: null };
    y[side] += ln.h + (isMobile() ? 6 : 8);
    return ln;
  });
  tv.streamH = Math.max(y.L, y.R);
  tv.lines.forEach((ln) => { ln.p.classList.add("bent"); ln.p.style.transform = "none"; });
}

// ?sync: tap (or space) when each line starts; the times apply at once, are kept on
// this device, and are copied so they can be put into PLAYABLE[...].times for everyone
function tapLine() {
  if (!tv.el || !tv.lines.length) return;
  tv.tapTimes.push(+tv.pos.toFixed(2));
  const box = tv.el.querySelector(".tv-sync");
  const n = tv.tapTimes.length, total = tv.lines.length;
  if (n < total) { box.textContent = `SYNC ${n} / ${total}`; return; }
  tv.times = tv.tapTimes.slice(); tv.syncing = false;
  try { localStorage.setItem(timesKey(tv.title), JSON.stringify(tv.times)); } catch {}
  const json = JSON.stringify(tv.times);
  box.innerHTML = `SYNC DONE — SEND THIS:<textarea readonly>${json}</textarea>`;
  navigator.clipboard?.writeText(json).catch(() => {});
}
addEventListener("keydown", (e) => { if (SYNC && tv.el && e.code === "Space") { e.preventDefault(); tapLine(); } });

// player mode: the page does not scroll — the wheel, a swipe and the arrow keys wind the
// track (and its lyrics) back and forth instead; BACK gives the page its scroll again
const inPlayer = () => document.body.classList.contains("tv-mode");
let wheelEnd = null;
function windBy(dk) {
  if (!ext || !tv.el || tv.busy || tv.leaving || !(tv.dur > 0)) return;
  if (!scrub) scrub = { last: 0 };
  scrubTo(Math.min(tv.progress + dk, 1 - 1 / tv.dur));    // winding stops a second short of the end
  clearTimeout(wheelEnd);
  wheelEnd = setTimeout(() => { if (scrub) { scrubTo(tv.progress, true); scrub = null; } }, 200);
}
addEventListener("wheel", (e) => {
  if (!inPlayer()) return;
  e.preventDefault();
  const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
  windBy(dy / 100 * 3 / (tv.dur || 1));                      // one wheel notch = 3 s of the track
}, { passive: false });
addEventListener("touchmove", (e) => { if (inPlayer()) e.preventDefault(); }, { passive: false });   // the stage's own drag winds the track
addEventListener("keydown", (e) => {
  if (!inPlayer() || e.target.closest?.("input, textarea")) return;
  const step = { ArrowDown: 5, ArrowUp: -5, PageDown: 20, PageUp: -20 }[e.key] / (tv.dur || 1);   // seconds
  if (step) { e.preventDefault(); windBy(step); return; }   // NaN for other keys
  if (e.key === "Home" || e.key === "End") { e.preventDefault(); windBy(e.key === "Home" ? -1 : 1); return; }
  if (e.code === "Space" && !SYNC && !e.target.closest?.("button")) { e.preventDefault(); toggle(); }
  if (e.key === "ArrowRight") stepTrack(1);
  if (e.key === "ArrowLeft") stepTrack(-1);
});
// the bottom bar's section links leave the player first
document.querySelectorAll(".bar .links a").forEach((a) => a.addEventListener("click", (e) => {
  if (!inPlayer()) return;
  e.preventDefault();
  closeTrack().then(() => document.querySelector(a.getAttribute("href"))?.scrollIntoView({ behavior: "smooth" }));
}));

// the silhouette row r, blended between the current and the next frame of the turn so it
// changes smoothly instead of jumping 5 times a second (tv.fa, tv.fb, tv.ff set by tvTick)
function profRow(r) {
  const a = tv.meta.frames[tv.fa].profile[r], b = tv.meta.frames[tv.fb].profile[r];
  if (a && b) return [a[0] + (b[0] - a[0]) * tv.ff, a[1] + (b[1] - a[1]) * tv.ff];
  return (tv.ff < 0.5 ? a : b) || null;
}
function carEdges(frame, y) {
  const { meta, rect } = tv, n = meta.frames[0].profile.length;
  const r = Math.floor((y - rect.y) / rect.h * n);
  let l = 1, rr = 0;
  for (let k = r - 2; k <= r + 2; k++) { const p = k >= 0 && k < n ? profRow(k) : null; if (p) { l = Math.min(l, p[0]); rr = Math.max(rr, p[1]); } }
  return l > rr ? null : [rect.x + l * rect.w, rect.x + rr * rect.w];
}

// push a point out of the car: onto the roof line, or back off the flank the rope hangs
// from (fromLeft) — never across to the far side, which made letters jump
function carPush(x, y, fromLeft) {
  const { meta, rect } = tv, n = meta.frames[0].profile.length;
  const r = Math.floor((y - rect.y) / rect.h * n);
  const row = r >= 0 && r < n ? profRow(r) : null;
  if (!row) return null;
  const l = rect.x + row[0] * rect.w, rr = rect.x + row[1] * rect.w;
  if (x <= l || x >= rr) return null;
  let top = r;
  for (let q = profRow(top - 1); top > 0 && q && rect.x + q[0] * rect.w < x && rect.x + q[1] * rect.w > x; q = profRow(top - 1)) top--;
  const yTop = rect.y + top / n * rect.h - 4;
  const side = fromLeft ? x - l : rr - x, du = y - yTop;
  if (du <= side * 1.2) return [x, yTop];
  return fromLeft ? [l - 1, y] : [rr + 1, y];
}

function tvTick(t) {
  if (!tv.el || !tv.img) return;
  const nowMs = performance.now();
  const dt = Math.min(0.05, Math.max(0.001, (nowMs - (tv.lastT || nowMs)) / 1000 || 0.016));
  tv.lastT = nowMs;
  const cv = tv.cv, dpr = Math.min(devicePixelRatio, 2);
  const W = cv.clientWidth, H = cv.clientHeight;
  if (!W || !H) return;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const { meta, img: im, ctx } = tv;
  // one slow turn every ~9.6 s whatever the number of frames, frames in order
  const n = meta.frames.length, ft = t * n / 9.6, frame = Math.floor(ft) % n;
  tv.fa = frame; tv.fb = (frame + 1) % n; tv.ff = ft - Math.floor(ft);
  // entrance: the car comes from far away (small, high, transparent) to its place
  let k = tv.appear0 ? ease(clamp((performance.now() - tv.appear0) / 1800)) : 0;
  if (tv.leave0) k = Math.min(k, 1 - ease(clamp((performance.now() - tv.leave0) / 1200)));
  const cw0 = Math.min(W * (isMobile() ? 0.7 : 0.34), H * 0.5 * meta.cellW / meta.cellH) * (tv.size || 1);
  const cw = cw0 * (0.12 + 0.88 * k), ch = cw * meta.cellH / meta.cellW;
  const cy = H * (0.4 + 0.1 * k);
  tv.rect = { x: (W - cw) / 2, y: cy - ch / 2, w: cw, h: ch };
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const c = frame % meta.cols, r = Math.floor(frame / meta.cols);
  ctx.globalAlpha = k;
  ctx.drawImage(im, c * meta.cellW, r * meta.cellH, meta.cellW, meta.cellH, tv.rect.x, tv.rect.y, cw, ch);
  ctx.globalAlpha = 1;
  tv.lyr.style.opacity = clamp((k - 0.5) * 2);
  // lyrics fall through the band around the object. With line times the current line sits at
  // the car's middle while it is sung; without them they spread over the track (no highlight).
  // Y: how far the stream has moved; a line sits at H/2 + (Y - its y0).
  // the lyrics live in a band around the object (where it stands once it has arrived): a line
  // fades in just above it and out just below it, instead of crawling in from the screen's top
  const ch0 = cw0 * meta.cellH / meta.cellW, fade = H * 0.07;
  const vis = tv.vis || [0, 1], top0 = H * 0.5 - ch0 / 2;
  const band = tv.band = [Math.max(fade, top0 + vis[0] * ch0 - H * 0.05), Math.min(H - fade, top0 + vis[1] * ch0 + H * 0.05)];
  let Y, curIdx = -1;
  const times = tv.times && tv.times.length ? tv.times : null;
  if (times) {
    const now = tv.pos;
    let i = 0;
    while (i + 1 < times.length && times[i + 1] <= now) i++;
    curIdx = now >= times[0] ? i : -1;
    const a = tv.lines[i], b = tv.lines[Math.min(i + 1, tv.lines.length - 1)];
    const span = (times[i + 1] ?? (times[i] + 4)) - times[i];
    const f = clamp((now - times[i]) / Math.max(0.1, span));
    const lead = now < times[0] ? clamp((times[0] - now) / 3) : 0;            // ease in before the first line
    const y0 = a ? a.y0 + ((b ? b.y0 : a.y0) - a.y0) * f : 0;
    Y = y0 - lead * H * 0.4;
  } else {
    // over the track the stream runs from the top of the band to its bottom
    Y = band[0] - H / 2 + (tv.progress || 0) * (tv.streamH + band[1] - band[0]);
  }
  // the stream follows the track with a little lag; moving it (playing, scrubbing) feeds
  // a wobble that dies down — the text behaves like jelly, not like a ruler
  tv.Ys = tv.Ys == null ? Y : tv.Ys + (Y - tv.Ys) * Math.min(1, dt * 7);
  const vel = (tv.Ys - (tv.prevYs ?? tv.Ys)) / dt;
  tv.prevYs = tv.Ys;
  tv.wob = Math.min(16, (tv.wob || 0) * Math.pow(0.08, dt) + Math.abs(vel) * dt * 0.6);
  const gap = isMobile() ? 6 : 12, cx = W / 2;
  const minX = isMobile() ? 6 : panelW + 10, maxX = isMobile() ? W - 6 : W - panelW - 10;
  // the part of a line that does not fit beside the car hangs off the car's edge like a
  // rope of letters: it has weight, swings when the text moves, lies on the car above its
  // middle and dangles below it — the letters never pass through the car
  // G: weight; KB: bending stiffness (each link wants to continue the previous one's
  // direction); KM: shape memory (each letter is drawn back towards its place in the
  // straight line) — together the tail sags but stays a little tense and springs back
  const G = 1300, steps = 2, KB = 0.05, KM = 0.004;
  for (const ln of tv.lines) {
    const y = H / 2 + (tv.Ys - ln.y0);
    const out = Math.max(band[0] - (y + ln.h), y - band[1]);    // how far the line is outside the band
    if (out > fade) {
      ln.p.style.visibility = "hidden"; ln.x = null; ln.ax = ln.ay = null;
      for (const c of ln.chars) { c.sx = undefined; c.rope = false; }
      continue;
    }
    ln.p.style.visibility = "visible";
    ln.p.style.opacity = clamp(1 - out / fade);
    const e = carEdges(frame, y + ln.h / 2);
    const L = ln.side === "L";
    let tx = L ? (e ? e[0] - gap - ln.w : cx - 8 - ln.w) : (e ? e[1] + gap : cx + 8);
    tx = Math.max(minX, Math.min(maxX - ln.w, tx));
    ln.x = ln.x == null ? tx : ln.x + (tx - ln.x) * Math.min(1, dt * 12);
    const B = e ? (L ? e[0] - gap : e[1] + gap) : null;          // where the car begins for this line
    const cyLine = y + ln.h / 2, n = ln.chars.length;
    const P = ln.chars.map((c) => ln.x + c.x + c.w / 2);         // straight letter centres (x)
    // which letters run into the car: a tail on the car side of the line
    // with a little hysteresis, so a letter near the edge does not flip back and forth
    let j = L ? n : 0;
    if (B != null) {
      const runs = (i) => (L ? P[i] > B + (ln.chars[i].rope ? -8 : 2) : P[i] < B - (ln.chars[i].rope ? -8 : 2));
      if (L) { j = 0; while (j < n && !runs(j)) j++; }
      else { j = n; while (j > 0 && !runs(j - 1)) j--; }
    }
    const isRope = (i) => (L ? i >= j : i < j);
    const order = [];                                             // rope letters from the anchor outwards
    if (L) for (let i = j; i < n; i++) order.push(i); else for (let i = j - 1; i >= 0; i--) order.push(i);
    const anchorIdx = L ? j - 1 : j;
    const anchor = anchorIdx >= 0 && anchorIdx < n ? { x: P[anchorIdx], y: cyLine } : { x: B ?? P[0], y: cyLine };
    // straight letters: the rigid line plus the springy ripple
    ln.chars.forEach((c, i) => {
      if (isRope(i)) return;
      if (c.rope) { c.sx = c.nx - P[i]; c.sy = c.ny - cyLine; c.vx = 0; c.vy = 0; }   // ease back from the tail
      c.rope = false;
      const dy = Math.sin(P[i] * 0.03 + t * 3.2 + ln.y0 * 0.1) * tv.wob * 0.25;
      if (c.sx === undefined) { c.sx = 0; c.sy = dy; c.vx = 0; c.vy = 0; }
      const kS = 120 + (i % 5) * 12, dmp = 13;
      for (let sub = 0; sub < 2; sub++) {
        const h = dt / 2;
        c.vx += ((0 - c.sx) * kS - c.vx * dmp) * h;
        c.vy += ((dy - c.sy) * kS - c.vy * dmp) * h;
        c.sx += c.vx * h; c.sy += c.vy * h;
      }
      c.cxp = P[i] + c.sx; c.cyp = cyLine + c.sy;
      c.el.style.transform = `translate3d(${(c.cxp - c.w / 2).toFixed(1)}px, ${(c.cyp - ln.h / 2).toFixed(1)}px, 0)`;
    });
    if (!order.length) continue;
    // rope letters: verlet with gravity, fixed spacing, pushed out of the car
    // the tail rides along with its line (most of the move, keeping its velocity) so a fast
    // scrub cannot leave it behind to whip round; the small lag left is what makes it swing
    const adx = ln.ax == null ? 0 : anchor.x - ln.ax, ady = ln.ay == null ? 0 : anchor.y - ln.ay;
    ln.ax = anchor.x; ln.ay = anchor.y;
    for (const i of order) {
      const c = ln.chars[i];
      if (!c.rope) { c.rope = true; c.nx = c.ox = P[i]; c.ny = c.oy = cyLine; continue; }
      c.nx += adx * 0.85; c.ox += adx * 0.85; c.ny += ady * 0.85; c.oy += ady * 0.85;
    }
    const h = dt / steps;
    for (let sIt = 0; sIt < steps; sIt++) {
      for (const i of order) {
        const c = ln.chars[i];
        const vx = (c.nx - c.ox) * 0.94, vy = (c.ny - c.oy) * 0.94;   // swings die out quickly
        c.ox = c.nx; c.oy = c.ny;
        c.nx += vx; c.ny += vy + G * h * h;
      }
      {
        // a little springiness, applied once per step: lean towards carrying on straight
        // from the previous link, and a faint pull back to the place in the straight line
        let px0 = anchor.x, py0 = anchor.y, dX = L ? 1 : -1, dY = 0, pI = anchorIdx;
        for (const i of order) {
          const c = ln.chars[i];
          const rest = pI >= 0 && pI < n ? Math.abs(P[i] - P[pI]) : c.w / 2 + 1;
          c.nx += (px0 + dX * rest - c.nx) * KB + (P[i] - c.nx) * KM;
          c.ny += (py0 + dY * rest - c.ny) * KB + (cyLine - c.ny) * KM;
          const sd = Math.hypot(c.nx - px0, c.ny - py0) || 1;
          dX = (c.nx - px0) / sd; dY = (c.ny - py0) / sd;
          px0 = c.nx; py0 = c.ny; pI = i;
        }
      }
      // joint limits: a link may turn at most ~35° from the previous one and the tail
      // at most ~110° from the line's own direction — it can droop, never whirl round
      const out = L ? 0 : Math.PI, JOINT = 0.6, TOTAL = 1.9;
      const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
      for (let it = 0; it < 6; it++) {
        let prevC = null, prevI = anchorIdx, prevAng = out;      // the first link hangs from the fixed anchor
        for (const i of order) {
          const c = ln.chars[i];
          const rest = prevI >= 0 && prevI < n ? Math.abs(P[i] - P[prevI]) : c.w / 2 + 1;
          const ax = prevC ? prevC.nx : anchor.x, ay = prevC ? prevC.ny : anchor.y;
          // one-sided chain from the anchor outwards: length, then out of the car, and the
          // joint limits last so nothing afterwards can fold the tail back over itself
          const dx = c.nx - ax, dy = c.ny - ay, d = Math.hypot(dx, dy) || 1e-3;
          c.nx = ax + dx / d * rest; c.ny = ay + dy / d * rest;
          const push = carPush(c.nx, c.ny, L);
          if (push) { c.nx = push[0]; c.ny = push[1]; }
          let ang = Math.atan2(c.ny - ay, c.nx - ax);
          ang = prevAng + Math.max(-JOINT, Math.min(JOINT, wrap(ang - prevAng)));
          ang = out + Math.max(-TOTAL, Math.min(TOTAL, wrap(ang - out)));
          c.nx = ax + Math.cos(ang) * rest; c.ny = ay + Math.sin(ang) * rest;
          if (c.ny > H + 40) c.ny = H + 40;
          prevAng = ang;
          prevC = c; prevI = i;
        }
      }
    }
    // draw rope letters along the rope, turned to its direction in reading order
    let last = anchor;
    const pts = order.map((i) => ln.chars[i]);
    pts.forEach((c, k) => {
      const nxt = pts[k + 1];
      // tangent in reading order (left to right in the original line)
      let ax, ay;
      if (L) { ax = c.nx - last.x; ay = c.ny - last.y; }
      else { ax = last.x - c.nx; ay = last.y - c.ny; }
      const rot = Math.atan2(ay, ax);
      c.el.style.transform = `translate3d(${(c.nx - c.w / 2).toFixed(1)}px, ${(c.ny - ln.h / 2).toFixed(1)}px, 0) rotate(${rot.toFixed(3)}rad)`;
      last = { x: c.nx, y: c.ny };
    });
  }
  tv.lines.forEach((ln, i) => ln.p.classList.toggle("cur", i === curIdx));
}

// the list in the HUD opens the same track views (switching in place when one is open)
function openByTitle(t) {
  const row = document.querySelector(`#exitTracks .tr[data-t="${CSS.escape(t)}"]`);
  if (row) openTrack(row);
}
$("#tracks").addEventListener("click", (e) => { const li = e.target.closest("li"); if (li) openByTitle(li.dataset.t); });
$("#tracks").addEventListener("keydown", (e) => { const li = e.target.closest("li"); if (li && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openByTitle(li.dataset.t); } });
$("#exitTracks").addEventListener("click", (e) => {
  const row = e.target.closest(".tr.playable");
  if (row) openTrack(row);
});

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
  mouse.x += (mouse.tx - mouse.x) * 0.06;
  p1s += (p1 - p1s) * Math.min(1, dt * 7);
  if (BODY && canvas.style.visibility !== "hidden") {
    const n = BODY.frames.length;
    // scroll alone drives the turn: frames go 0, 1, 2 … 15, 0 in order, one at a time
    spinS += (spin - spinS) * Math.min(1, dt * 7);
    const a = Math.floor(spinS * 2.6 * n) % n;
    // the figure burns exactly where the edge fire's flames actually are under him
    const flameTop = s2.getBoundingClientRect().top - fireReach;
    figMat.uniforms.uFront.value = (fig.y + fig.h - flameTop) / fig.h;
    glitchT = Math.max(0, glitchT - dt);
    const spike = Math.random() < 0.012 ? 0.3 : 0;
    figMat.uniforms.uA.value = a;
    figMat.uniforms.uB.value = a;
    figMat.uniforms.uMix.value = 0;
    figMat.uniforms.uTime.value = t;
    figMat.uniforms.uGlitch.value = Math.max(glitchT * 2, spike);
    figMat.uniforms.uSplit.value = 0.003 + glitchT * 0.02;
    renderer.render(scene, camera);
    flowText(a);
  }
  tvTick(t);
  drawMini(t);
  if (bustMeta && s2.getBoundingClientRect().bottom > 0 && s2.getBoundingClientRect().top < innerHeight) {
    const n = bustMeta.count || 16;
    drawHead(Math.floor((t / HEAD_TURN + headP2) * n) % n);
  }
  // Xanax bars on slide 3, only while it is on screen
  const pr = pillCv.getBoundingClientRect();
  if (pr.bottom > 0 && pr.top < innerHeight) drawPills(dt);
  const cr = cloudCv.getBoundingClientRect();
  if (cr.bottom > 0 && cr.top < innerHeight) drawClouds(t);
  // fire on the slide-2 edge, only while it is on screen
  const fr = fireCv.getBoundingClientRect();
  if (edgeFire && fr.bottom > 0 && fr.top < innerHeight) edgeFire.render(t);
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- load assets, then start
const loadNum = $("#loadNum"), loadBar = $("#loadBar");
let shown = 0, target = 5;
const lt = setInterval(() => {
  shown = Math.min(target, shown + 3 + Math.random() * 6);
  loadNum.textContent = String(shown | 0).padStart(3, "0");
  loadBar.style.transform = `scaleX(${shown / 100})`;
  if (shown >= 100) { clearInterval(lt); $("#loader").classList.add("ready"); }
}, 40);
const img = (src) => new Promise((ok, err) => { const i = new Image(); i.onload = () => ok(i); i.onerror = err; i.src = src; });
const tex = new THREE.TextureLoader();
Promise.all([
  fetch(asset("assets/arseny_body.json")).then((r) => r.json()).then((j) => { target += 30; return j; }),
  fetch(asset("assets/arseny_bust.json")).then((r) => r.json()),
  tex.loadAsync(asset("assets/arseny_body.webp")).then((t) => { target += 35; return t; }),
  img(asset("assets/arseny_bust.webp")).then((i) => { target += 25; return i; }),
  img(asset("assets/xanax_bar.webp")).then((i) => (pillImg = i)),
  document.fonts.ready,
]).then(([body, bustJ, atlas, bust]) => {
  BODY = body; bustMeta = bustJ; bustImg = bust;
  atlas.minFilter = THREE.LinearFilter; atlas.generateMipmaps = false;
  figMat.uniforms.uAtlas.value = atlas;
  figMat.uniforms.uGrid.value.set(body.cols, body.rows);
  target = 100;
  resize();
  onScroll();
  frame();
}).catch((err) => {                                   // never leave the page stuck behind the loader
  console.error("asset load failed", err);
  target = 100;
});
