// Shared fire: one palette and one dither for the burning figure and for the
// burning edge of the white slide, so the two read as the same fire.

export const FIRE_GLSL = /* glsl */`
  float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
  float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
  // deep red -> site red -> orange -> hot white
  vec3 firePal(float h) {
    vec3 c = mix(vec3(0.35, 0.0, 0.0), vec3(1.0, 0.04, 0.04), smoothstep(0.0, 0.4, h));
    c = mix(c, vec3(1.0, 0.45, 0.05), smoothstep(0.4, 0.7, h));
    return mix(c, vec3(1.0, 0.95, 0.8), smoothstep(0.75, 1.0, h));
  }
  // white-grey fire: smoke grey -> ash -> the site's white (#f2f2f2), so the hottest
  // flame is exactly the colour of the white slide it grows out of
  const vec3 PAPER = vec3(0.949);
  vec3 greyPal(float h) {                       // smooth top end: the last steps are near-white
    vec3 c = mix(vec3(0.16), vec3(0.42), smoothstep(0.0, 0.35, h));
    c = mix(c, vec3(0.74), smoothstep(0.35, 0.65, h));
    return mix(c, PAPER, smoothstep(0.6, 1.0, h));
  }
  // stepped heat: 5 levels, ordered-dithered on the pixel grid
  float stepHeat(float h, float t) { return floor(clamp(h, 0.0, 1.0) * 5.0 + t) / 5.0; }
  // finer steps for the edge fire, so white melts into flame instead of jumping
  float stepHeatFine(float h, float t) { return floor(clamp(h, 0.0, 1.0) * 10.0 + t) / 10.0; }
`;

// Edge fire: the white slide fills the bottom; white-grey flames grow out of its
// ragged top with no seam — the base of the fire is the same white as the slide.
// Variants share the line and the palette, they differ in how the flames are shaped.
export const VARIANTS = [
  { id: "paper", name: "SOFT TONGUES", note: "мягкие клубящиеся языки" },
  { id: "impostor", name: "IMPOSTOR FLAME", note: "та же форма пламени, что на фигуре: шумовые языки" },
  { id: "bigpixel", name: "BIG PIXEL", note: "как IMPOSTOR, но крупный пиксель 8px" },
  { id: "glitch", name: "GLITCH FIRE", note: "пламя рвётся полосами и расслаивается по RGB" },
  { id: "embers", name: "EMBERS", note: "низкое пламя и искры вверх" },
  { id: "figure", name: "AS ON ARSENY", note: "ровно та же формула, что жжёт фигуру: рваная полоса огня" },
];

const FRAG = /* glsl */`#version 300 es
  precision highp float;
  uniform vec2 uRes;            // canvas size, device px
  uniform float uTime, uPix, uEdge, uFlame, uVariant, uStrength, uDpr;
  uniform vec3 uPaper;
  out vec4 outColor;
  ${FIRE_GLSL}
  void main() {
    float v = uVariant;
    float pix = v == 2.0 ? 8.0 * uDpr : uPix;              // uPix = 2 css px, as on the figure
    vec2 g = floor(gl_FragCoord.xy / pix) * pix + pix * 0.5;   // pixel-grid sample point
    vec2 p = g / uDpr;                                          // css px, y up from canvas bottom
    float t = bayer4(gl_FragCoord.xy / pix);
    float T = uTime;

    if (v == 3.0) {                                             // glitch: horizontal tears
      float band = floor(p.y / 9.0);
      float on = step(0.86, hash(vec2(band, floor(T * 12.0))));
      p.x += on * (hash(vec2(band, 3.0)) - 0.5) * 70.0;
    }

    // the source line: ragged, slowly crawling (not drawn itself)
    float line = uEdge + (fbm(vec2(p.x / 220.0, T * 0.2)) - 0.5) * 16.0;       // gentle: the white must not read as a cut-out shape
    float below = line - p.y;                                   // > 0: under the line
    if (below > 0.0) { outColor = vec4(PAPER, 1.0); return; }   // the white slide itself
    float base = pow(1.0 - smoothstep(0.0, 85.0, -below), 0.75);   // white-hot base fading up over ~85px: no seam

    if (v == 5.0) {
      // the figure's burn, unrolled along the edge: same noise scales (figure ~333 x 666 css px),
      // same band (-0.09 .. 0.05 of figure height), same ember field below
      float n = noise(vec2(p.x / 23.8, p.y / 30.3 - T * 4.0));
      float n2 = noise(vec2(p.x / 11.1 + 7.0, p.y / 74.0 - T * 6.5));
      float d = (below + (n - 0.5) * 93.0) / 666.0;
      if (d >= 0.05) { outColor = vec4(PAPER, 1.0); return; }  // burnt through = white
      if (d > -0.09) {
        float h = clamp(1.0 - abs(d + 0.01) / 0.08, 0.0, 1.0) * (0.55 + 0.6 * n2) * uStrength;
        h = stepHeatFine(max(h, base), t);
        outColor = h > 0.0 ? vec4(greyPal(h), 1.0) : vec4(0.0);
        return;
      }
      if (base > 0.0) { outColor = vec4(greyPal(stepHeatFine(base, t)), 1.0); return; }
      outColor = vec4(0.0); return;
    }

    float up = -below / uFlame;                                 // 0 at the line, 1 at full flame height
    float h = 0.0;
    if (v == 0.0) {                                             // paper burn: soft fbm tongues
      float f = fbm(vec2(p.x / 70.0, p.y / 90.0 - T * 1.4));
      float tongue = fbm(vec2(p.x / 160.0 + 3.0, T * 0.5));
      h = (f * 1.5 - up * (1.6 - tongue * 0.9)) * uStrength;
    } else if (v == 4.0) {                                      // embers: low flame + sparks
      float f = fbm(vec2(p.x / 50.0, p.y / 60.0 - T * 1.8));
      h = (f * 1.3 - up * 3.2) * uStrength;
      vec2 cell = floor(vec2(p.x / 6.0, (p.y - T * 70.0) / 6.0));
      float s = hash(cell);
      float life = 1.0 - up * 0.9;
      if (s > 0.985 && up < 1.1) h = max(h, life * (0.5 + 0.5 * hash(cell + 9.0)));
    } else {                                                    // impostor shapes (also bigpixel, glitch)
      float n = noise(vec2(p.x / 34.0, p.y / 26.0 - T * 4.0));
      float n2 = noise(vec2(p.x / 16.0 + 7.0, p.y / 70.0 - T * 6.5));
      float tongue = 0.35 + 0.65 * noise(vec2(p.x / 55.0, T * 0.9));
      float d = up / tongue + (n - 0.5) * 0.35;
      h = clamp(1.0 - d, 0.0, 1.0) * (0.55 + 0.6 * n2) * uStrength;
    }
    h = stepHeatFine(max(h, base), t);
    if (h <= 0.0) { outColor = vec4(0.0); return; }
    vec3 col = greyPal(h);
    if (v == 3.0) {                                             // glitch: channel split on the torn bands
      float sh = noise(vec2(p.x / 34.0 + 1.0, p.y / 26.0 - T * 4.0));
      col = mix(col, col.gbr * vec3(0.8, 1.0, 1.2), 0.35 * step(0.8, sh));
    }
    outColor = vec4(col, 1.0);
  }`;

const VERT = /* glsl */`#version 300 es
  in vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

// createEdgeFire(canvas, { variant, edge, flame }) — edge: css px of paper at the
// bottom of the canvas; flame: css px of full flame height above the line.
export function createEdgeFire(canvas, opts = {}) {
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: false, alpha: true, antialias: false });
  if (!gl) return null;
  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  for (const n of ["uRes", "uTime", "uPix", "uEdge", "uFlame", "uVariant", "uStrength", "uDpr", "uPaper"]) U[n] = gl.getUniformLocation(prog, n);

  const state = {
    variant: opts.variant ?? 0, edge: opts.edge ?? 60, flame: opts.flame ?? 260, strength: opts.strength ?? 1,
    paper: opts.paper ?? [242 / 255, 242 / 255, 242 / 255],
  };
  function resize() {
    const dpr = Math.min(devicePixelRatio, opts.maxDpr ?? 2);
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function render(time) {
    const dpr = canvas.width / Math.max(1, canvas.getBoundingClientRect().width);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, time);
    gl.uniform1f(U.uDpr, dpr);
    gl.uniform1f(U.uPix, 2 * dpr);
    gl.uniform1f(U.uEdge, state.edge);
    gl.uniform1f(U.uFlame, state.flame);
    gl.uniform1f(U.uVariant, state.variant);
    gl.uniform1f(U.uStrength, state.strength);
    gl.uniform3f(U.uPaper, ...state.paper);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  resize();
  return { state, resize, render };
}
