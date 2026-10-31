import * as THREE from "three";
import { FIRE_GLSL, createEdgeFire } from "./fire.js?v=14";

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

const V = "14";                                       // bump with index.html ?v= on every deploy (Pages caches 10 min)
const asset = (p) => `${p}?v=${V}`;
const isMobile = () => innerWidth <= 820;
const $ = (s) => document.querySelector(s);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// ---------------------------------------------------------------- DOM fill
$("#roles").innerHTML = [...ROLES, ...ROLES].map((r) => `<span>${r}</span>`).join("");
$("#tracks").innerHTML = TRACKS.map(([t, d], i) => `<li><span>${String(i + 1).padStart(2, "0")} ${t}</span><span>${d}</span></li>`).join("");
$("#exitTracks").innerHTML = TRACKS.map(([t, d], i) => `<div><span>${String(i + 1).padStart(2, "0")} ${t}</span><b>${d}</b></div>`).join("");

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
const HEAD_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];   // one full turn, in order

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
  const r1 = s1.getBoundingClientRect();
  p1 = clamp(-r1.top / (r1.height - innerHeight));
  $("#progBar").style.setProperty("--p", p1);
  const ti = Math.min(TRACKS.length - 1, Math.floor(p1 * TRACKS.length));
  if (ti !== lastTrack) { trackEls[lastTrack]?.classList.remove("on"); trackEls[ti].classList.add("on"); lastTrack = ti; glitchT = 0.35; }

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
  drawHead(HEAD_SEQ[Math.floor(p2 * (HEAD_SEQ.length - 1) + 0.5)]);
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
function syncUI() {
  const on = !audio.paused;
  plBtn.textContent = on ? "PAUSE" : "PLAY";
  barPlay.querySelector("b").textContent = on ? "PAUSE" : "PLAY";
  player.classList.toggle("paused", !on);
  plState.textContent = on ? "ON AIR" : (userPaused ? "PAUSED" : "CLICK TO PLAY");
  plState.classList.toggle("wait", !on && !userPaused);
}
function toggle() {
  if (audio.paused) { userPaused = false; play(true).then(syncUI); }
  else { userPaused = true; audio.pause(); }
}
plBtn.addEventListener("click", toggle);
barPlay.addEventListener("click", toggle);
plMute.addEventListener("click", () => {
  vol = vol > 0.5 ? 0.5 : vol > 0 ? 0 : 1;                  // 100 → 50 → 0 → 100
  audio.volume = vol;
  plMute.textContent = `VOL ${String(Math.round(vol * 100)).padStart(3, "0")}`;
});
$("#plBar").addEventListener("click", (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  if (isFinite(audio.duration)) audio.currentTime = clamp((e.clientX - r.left) / r.width) * audio.duration;
});
["play", "pause"].forEach((ev) => audio.addEventListener(ev, syncUI));
audio.addEventListener("timeupdate", () => {
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
  if (analyser && !audio.paused) {
    analyser.getByteFrequencyData(freq);
    for (let i = 0; i < VIZ_N; i++) vizBars[i].style.transform = `scaleY(${Math.max(0.04, freq[i + 2] / 255)})`;
  } else if (!audio.paused) {                        // no analyser (touch): a fake but lively meter
    const t = audio.currentTime;
    vizBars.forEach((b, i) => b.style.transform = `scaleY(${Math.max(0.04, 0.5 + 0.45 * Math.sin(t * (3 + i * 0.37) + i) * Math.sin(t * 1.7 + i * 0.5))})`);
  } else {
    for (const b of vizBars) b.style.transform = "scaleY(.04)";
  }
  requestAnimationFrame(vizFrame);
}
vizFrame();

$("#enter").addEventListener("click", () => {
  askGyro();
  userPaused = false;
  play(true).then(syncUI);
  $("#loader").classList.add("done");
});

// ---------------------------------------------------------------- slide 3: Xanax bars pattern
// A staggered field of 2 mg bars (photo, assets/xanax_bar.webp), all at one angle,
// drifting. On a phone the tilt steers the drift; on a desktop the mouse does.
const pillCv = $("#pills"), pillCtx = pillCv.getContext("2d");
let pillImg = null;
const tilt = { x: 0, y: 0, tx: 0, ty: 0 };              // -1..1, smoothed
let pillDX = 0, pillDY = 0, gyroOn = false;
addEventListener("deviceorientation", (e) => {
  if (e.gamma == null) return;
  gyroOn = true;
  tilt.tx = clamp(e.gamma / 35, -1, 1);                 // left / right
  tilt.ty = clamp(((e.beta ?? 45) - 45) / 35, -1, 1);   // forward / back from a natural reading angle
});
addEventListener("pointermove", (e) => {
  if (gyroOn) return;
  tilt.tx = e.clientX / innerWidth * 2 - 1;
  tilt.ty = e.clientY / innerHeight * 2 - 1;
});
// iOS only grants motion sensors from a user gesture: ask on ENTER
function askGyro() {
  const D = window.DeviceOrientationEvent;
  if (D && typeof D.requestPermission === "function") D.requestPermission().catch(() => {});
}
const PILL_ANGLE = -0.32;                               // every bar at the same slant
function drawPills(dt) {
  if (!pillImg) return;
  const dpr = pillCv.width / Math.max(1, pillCv.clientWidth);
  const w = pillCv.width, h = pillCv.height;
  tilt.x += (tilt.tx - tilt.x) * Math.min(1, dt * 4);
  tilt.y += (tilt.ty - tilt.y) * Math.min(1, dt * 4);
  pillDX += (10 + tilt.x * 90) * dt * dpr;              // a slow default drift, steered by tilt
  pillDY += (-12 + tilt.y * 90) * dt * dpr;
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
function sizePills() {
  const r = pillCv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 2);
  pillCv.width = Math.max(1, Math.round(r.width * dpr));
  pillCv.height = Math.max(1, Math.round(r.height * dpr));
}

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
  // Xanax bars on slide 3, only while it is on screen
  const pr = pillCv.getBoundingClientRect();
  if (pr.bottom > 0 && pr.top < innerHeight) drawPills(dt);
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
