import * as THREE from "three";

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

const isMobile = () => innerWidth <= 820;
const $ = (s) => document.querySelector(s);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// ---------------------------------------------------------------- DOM fill
$("#roles").innerHTML = [...ROLES, ...ROLES].map((r) => `<span>${r}</span>`).join("");
$("#tracks").innerHTML = TRACKS.map(([t, d], i) => `<li><span>${String(i + 1).padStart(2, "0")} ${t}</span><span>${d}</span></li>`).join("");
$("#exitTracks").innerHTML = TRACKS.map(([t, d], i) => `<div><span>${String(i + 1).padStart(2, "0")} ${t}</span><b>${d}</b></div>`).join("");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
$("#case").innerHTML = CASE.map((line, i) => {
  const red = line.startsWith("*");
  const txt = esc(red ? line.slice(1) : line).replace(/\[(.+?)\]/g, '<span class="g">$1</span>');
  return `<p class="${i % 2 ? "R" : "L"}${red ? " hit" : ""}" data-t="${i}">${txt}</p>`;
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

// ---------------------------------------------------------------- torn edge
(function tear() {
  const svg = $("#tear");
  let white = "M0 60 ", red = "";
  for (let x = 0; x <= 1000; x += 8) white += `L${x} ${(12 + Math.random() * 40) | 0} `;
  white += "L1000 60Z";
  for (const [a, b] of [[150, 300], [560, 790]]) {
    red += `M${a} 60 `;
    for (let x = a; x <= b; x += 10) red += `L${x} ${(Math.random() * 30) | 0} `;
    red += `L${b} 60Z `;
  }
  svg.innerHTML = `<path d="${red}" fill="#ff0a0a"/><path d="${white}" fill="#f2f2f2"/>`;
})();

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

// ---------------------------------------------------------------- point-cloud figure (placeholder body)
// Capsules: [ax,ay,az, bx,by,bz, radius, scaleX, scaleZ]. Swap for the impostor later.
const BODY = [
  // legs
  [-0.10, 0.95, 0, -0.11, 0.52, 0.03, 0.080, 1, 1], [-0.11, 0.52, 0.03, -0.12, 0.09, -0.01, 0.062, 1, 1],
  [-0.12, 0.05, -0.02, -0.12, 0.04, 0.15, 0.048, 1.1, 1],
  [0.10, 0.95, 0, 0.12, 0.52, 0.01, 0.080, 1, 1], [0.12, 0.52, 0.01, 0.13, 0.09, -0.02, 0.062, 1, 1],
  [0.13, 0.05, -0.03, 0.14, 0.04, 0.14, 0.048, 1.1, 1],
  // pelvis, torso (hoodie), shoulders, neck
  [-0.12, 0.97, 0, 0.12, 0.97, 0, 0.11, 1, 1],
  [0, 0.98, 0, 0, 1.40, 0, 0.175, 1.18, 0.72],
  [-0.20, 1.41, 0, 0.20, 1.41, 0, 0.085, 1, 1],
  [0, 1.44, 0, 0, 1.56, 0.01, 0.06, 1, 1],
  // head + cap
  [0, 1.64, 0.01, 0, 1.70, 0.01, 0.098, 1, 1.05],
  [0, 1.735, 0.0, 0, 1.745, 0.0, 0.105, 1, 1],
  [-0.06, 1.72, 0.11, 0.06, 1.72, 0.11, 0.022, 1, 2.2],
  // left arm hanging
  [-0.23, 1.40, 0, -0.27, 1.14, -0.01, 0.060, 1, 1], [-0.27, 1.14, -0.01, -0.28, 0.90, 0.03, 0.048, 1, 1],
  [-0.28, 0.86, 0.04, -0.28, 0.82, 0.05, 0.045, 1, 1],
  // right arm raised to the face — the vape
  [0.23, 1.40, 0, 0.25, 1.16, 0.13, 0.060, 1, 1], [0.25, 1.16, 0.13, 0.08, 1.49, 0.15, 0.048, 1, 1],
  [0.07, 1.53, 0.15, 0.05, 1.57, 0.15, 0.045, 1, 1],
  [0.045, 1.57, 0.16, 0.02, 1.64, 0.20, 0.012, 1, 1],
];

function buildCloud(N) {
  const areas = BODY.map((c) => {
    const len = Math.hypot(c[3] - c[0], c[4] - c[1], c[5] - c[2]);
    return 2 * Math.PI * c[6] * len * (c[7] + c[8]) / 2 + 4 * Math.PI * c[6] * c[6];
  });
  const total = areas.reduce((a, b) => a + b, 0);
  const pos = new Float32Array(N * 3), nor = new Float32Array(N * 3), rnd = new Float32Array(N);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), ax = new THREE.Vector3(), d = new THREE.Vector3(), p = new THREE.Vector3();
  let k = 0;
  BODY.forEach((c, ci) => {
    const n = ci === BODY.length - 1 ? N - k : Math.round(N * areas[ci] / total);
    a.set(c[0], c[1], c[2]); b.set(c[3], c[4], c[5]);
    ax.subVectors(b, a); const len = ax.length(); ax.normalize();
    const capShare = (4 * Math.PI * c[6] * c[6]) / areas[ci];
    for (let i = 0; i < n && k < N; i++, k++) {
      d.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
      let t;
      if (Math.random() < capShare) {                 // hemispherical caps
        const end = d.dot(ax) > 0;
        t = end ? 1 : 0;
      } else {                                        // tube: strip the axial part
        d.addScaledVector(ax, -d.dot(ax)).normalize();
        t = Math.random();
      }
      p.copy(a).addScaledVector(ax, t * len);
      const off = d.clone().multiplyScalar(c[6]);
      off.x *= c[7]; off.z *= c[8];
      p.add(off);
      pos.set([p.x, p.y, p.z], k * 3);
      nor.set([d.x / c[7], d.y, d.z / c[8]], k * 3);
      rnd[k] = Math.random();
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("rnd", new THREE.BufferAttribute(rnd, 1));
  return g;
}

const VERT = /* glsl */`
  attribute float rnd;
  uniform float uTime, uSize, uGlitch;
  uniform vec2 uOff;
  varying float vB;
  void main() {
    vec3 p = position;
    float band = floor(p.y * 38.0);
    float g = step(0.93, fract(sin(band * 91.7 + floor(uTime * 9.0)) * 4375.85)) * uGlitch;
    p.x += g * (fract(sin(band * 13.1) * 917.3) - 0.5) * 0.35;
    p += normal * 0.004 * sin(uTime * 2.0 + rnd * 40.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vec3 L = normalize(vec3(-0.45, 0.55, 0.7));
    float lam = max(dot(n, L), 0.0);
    float rim = pow(1.0 - abs(n.z), 3.0);
    vB = 0.02 + 0.8 * lam * lam + 0.3 * rim;
    gl_Position = projectionMatrix * mv;
    gl_Position.xy += uOff * gl_Position.w;
    gl_PointSize = uSize * (0.75 + rnd * 0.5);
  }`;
const FRAG = /* glsl */`
  uniform vec3 uColor;
  varying float vB;
  float bayer(vec2 f) {
    ivec2 i = ivec2(mod(f, 4.0));
    int idx = i.y * 4 + i.x;
    float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
    for (int k = 0; k < 16; k++) if (k == idx) return (m[k] + 0.5) / 16.0;
    return 0.5;
  }
  void main() {
    if (vB < bayer(gl_FragCoord.xy)) discard;
    gl_FragColor = vec4(uColor * min(vB, 1.0), 1.0);
  }`;

const canvas = $("#stage");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
const fig = new THREE.Group();
scene.add(fig);

const geo = buildCloud(isMobile() ? 26000 : 52000);
geo.translate(0, -0.9, 0);
const channels = [[1, 0.1, 0.1], [0.1, 1, 0.25], [0.2, 0.3, 1]].map((col, i) => {
  const m = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Vector3(...col) }, uTime: { value: 0 }, uSize: { value: 2 }, uGlitch: { value: 0 }, uOff: { value: new THREE.Vector2() } },
  });
  m.userData.i = i;
  fig.add(new THREE.Points(geo, m));
  return m;
});

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const figH = isMobile() ? 2.7 : 3.3;                     // world units visible vertically
  camera.position.set(0, 0, figH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))));
  camera.updateProjectionMatrix();
  const px = renderer.getPixelRatio();
  channels.forEach((m) => (m.uniforms.uSize.value = (isMobile() ? 1.4 : 1.7) * px));
  drawTerrain($("#terrainDark"), "#2b2b2b", 3.1, 1.25);
  drawTerrain($("#terrainLight"), "#bdbdbd", 7.7, 1.5);
}
addEventListener("resize", resize);
resize();

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
const s1 = $("#s1"), s2 = $("#s2"), cross = $("#cross"), head = $("#head"), bignum = $("#bignum");
const NUMS = ["2022", "+995", "6.66", "0300"];
let p1 = 0, lastTrack = -1, glitchT = 0;

function onScroll() {
  const r1 = s1.getBoundingClientRect();
  p1 = clamp(-r1.top / (r1.height - innerHeight));
  document.documentElement.style.setProperty("--p", p1);
  $("#progBar").style.setProperty("--p", p1);
  const ti = Math.min(TRACKS.length - 1, Math.floor(p1 * TRACKS.length));
  if (ti !== lastTrack) { trackEls[lastTrack]?.classList.remove("on"); trackEls[ti].classList.add("on"); lastTrack = ti; glitchT = 0.35; }

  const r2 = s2.getBoundingClientRect();
  const p2 = clamp(-r2.top / (r2.height - innerHeight));
  const enter = clamp(1 - r2.top / innerHeight);              // 0 → 1 while slide 2 rises
  cross.style.setProperty("--rot", `${-28 * p2}deg`);
  cross.style.setProperty("--sc", 0.85 + 0.15 * enter + 0.12 * p2);
  cross.style.setProperty("--mx", clamp((p2 - 0.3) * 3));
  head.style.setProperty("--hy", `${(1 - enter) * 22}vh`);
  bignum.textContent = NUMS[Math.min(NUMS.length - 1, Math.floor(p2 * NUMS.length))];
  canvas.style.visibility = r2.top > 0 ? "visible" : "hidden";
  $("#terrainDark").style.visibility = canvas.style.visibility;
}
addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
function frame() {
  const dt = clock.getDelta(), t = clock.elapsedTime;
  mouse.x += (mouse.tx - mouse.x) * 0.06;
  mouse.y += (mouse.ty - mouse.y) * 0.06;
  if (canvas.style.visibility !== "hidden") {
    fig.rotation.y = p1 * Math.PI * 2.4 + mouse.x * 0.25 + Math.sin(t * 0.4) * 0.05;
    fig.rotation.x = mouse.y * 0.06;
    glitchT = Math.max(0, glitchT - dt);
    const spike = Math.random() < 0.01 ? 0.25 : 0;
    const split = 0.0025 + glitchT * 0.02;
    channels.forEach((m, i) => {
      m.uniforms.uTime.value = t;
      m.uniforms.uGlitch.value = Math.max(glitchT * 2, spike);
      m.uniforms.uOff.value.set((i - 1) * split, (i - 1) * split * 0.3);
    });
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- loader
let ln = 0;
const lt = setInterval(() => {
  ln = Math.min(100, ln + 4 + Math.random() * 9);
  $("#loadNum").textContent = String(ln | 0).padStart(3, "0");
  $("#loadBar").style.transform = `scaleX(${ln / 100})`;
  if (ln >= 100) { clearInterval(lt); $("#loader").classList.add("done"); }
}, 45);
frame();
