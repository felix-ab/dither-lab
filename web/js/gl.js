/* Dither Lab — WebGL2 renderer: base (grid / ASCII / halftone) → FX → bloom + halation → composite → viewer. */
(() => {
  const DL = window.DL;
  const E = DL.engine;

  const VERT = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

  const COMMON = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
in vec2 vUv;
out vec4 o;
const float TAU = 6.28318530718;
uvec3 pcg3d(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  return v;
}
float h3(ivec3 p) { return float(pcg3d(uvec3(p)).x & 0xffffffu) / 16777216.0; }
float vnoise(vec3 p, int per) {
  ivec3 i = ivec3(floor(p)); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  int z0 = per > 0 ? ((i.z % per) + per) % per : i.z;
  int z1 = per > 0 ? (z0 + 1) % per : i.z + 1;
  float a = mix(mix(h3(ivec3(i.x, i.y, z0)), h3(ivec3(i.x + 1, i.y, z0)), f.x),
                mix(h3(ivec3(i.x, i.y + 1, z0)), h3(ivec3(i.x + 1, i.y + 1, z0)), f.x), f.y);
  float b = mix(mix(h3(ivec3(i.x, i.y, z1)), h3(ivec3(i.x + 1, i.y, z1)), f.x),
                mix(h3(ivec3(i.x, i.y + 1, z1)), h3(ivec3(i.x + 1, i.y + 1, z1)), f.x), f.y);
  return mix(a, b, f.z);
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
`;

  const FX = COMMON + `
uniform vec2 uRes; uniform float uScale; uniform vec2 uOut; uniform int uMode; uniform float uPhase;
uniform sampler2D uGrid; uniform ivec2 uGridSize; uniform float uPixel;
uniform sampler2D uAsciiData; uniform sampler2D uAtlas; uniform ivec2 uAsciiGrid; uniform vec2 uCell;
uniform vec4 uAtlasGeo; uniform vec4 uAsciiBg;
uniform sampler2D uTone; uniform vec2 uToneSize; uniform sampler2D uSpotLut; uniform int uShape; uniform float uCellPx;
uniform int uCmyk; uniform vec4 uAngles; uniform vec4 uOpac; uniform vec4 uOffX; uniform vec4 uOffY;
uniform vec3 uInkC; uniform vec3 uInkM; uniform vec3 uInkY; uniform vec3 uInkK; uniform vec4 uPaper;
uniform float uSoft; uniform float uGain; uniform float uGcr;
uniform float uWaveAmp; uniform float uWaveFreq; uniform vec2 uWaveM;
uniform int uCaOn; uniform int uCaRadial; uniform float uCaAmt; uniform vec2 uCaDir; uniform float uCaFall; uniform vec3 uCaMag;
uniform float uShimAmt; uniform float uShimScale; uniform float uShimP; uniform int uShimBlue; uniform sampler2D uBlue;

vec4 gridAt(vec2 p) {
  ivec2 c = ivec2(floor(p / uPixel));
  if (c.x < 0 || c.y < 0 || c.x >= uGridSize.x || c.y >= uGridSize.y) return vec4(0.0);
  return texelFetch(uGrid, c, 0);
}
vec4 asciiAt(vec2 p) {
  vec2 q = p / uCell;
  ivec2 c = ivec2(floor(q));
  if (c.x < 0 || c.y < 0 || c.x >= uAsciiGrid.x || c.y >= uAsciiGrid.y) return vec4(0.0);
  vec4 d = texelFetch(uAsciiData, c, 0);
  float idx = floor(d.a * 255.0 + 0.5);
  vec2 l = fract(q);
  // uAtlasGeo: slotW, pad, atlasW, atlasH (texels)
  float tx = (idx * uAtlasGeo.x + uAtlasGeo.y + l.x * (uAtlasGeo.x - 2.0 * uAtlasGeo.y)) / uAtlasGeo.z;
  float ty = (uAtlasGeo.y + l.y * (uAtlasGeo.w - 2.0 * uAtlasGeo.y)) / uAtlasGeo.w;
  float cov = idx < 0.5 ? 0.0 : texture(uAtlas, vec2(tx, ty)).a;
  return vec4(mix(uAsciiBg.rgb, d.rgb, cov), mix(uAsciiBg.a, 1.0, cov));
}
float spotF(vec2 uv) {
  vec2 a = abs(uv);
  if (uShape == 1) return (a.x + a.y <= 1.0) ? dot(uv, uv) - 1.0 : 1.0 - dot(a - 1.0, a - 1.0);
  if (uShape == 2) return a.x + a.y;
  if (uShape == 3) return max(a.x, a.y);
  if (uShape == 4) return a.y;
  if (uShape == 5) return uv.x * uv.x * 0.72 + uv.y * uv.y * 1.38;
  return dot(uv, uv);
}
float spotThr(float c) {
  int i = int(clamp(c, 0.0, 1.0) * 255.0 + 0.5);
  return texelFetch(uSpotLut, ivec2(i, uShape), 0).r;
}
vec4 cmykOf(vec3 c) {
  float k = 1.0 - max(max(c.r, c.g), c.b);
  float kk = k * uGcr;
  vec3 cmy = (1.0 - c - kk) / max(1.0 - kk, 1e-4);
  return clamp(vec4(cmy, kk), 0.0, 1.0);
}
float plate(vec2 p, float ang, vec2 off, int ch) {
  vec2 q = p - off;
  float cs = cos(ang), sn = sin(ang);
  vec2 r = vec2(cs * q.x + sn * q.y, -sn * q.x + cs * q.y) / uCellPx;
  vec2 cell = floor(r) + 0.5;
  vec2 l = (r - cell) * 2.0;
  vec2 cc = cell * uCellPx;
  vec2 center = vec2(cs * cc.x - sn * cc.y, sn * cc.x + cs * cc.y) + off;
  float lod = log2(max(1.0, uCellPx * uToneSize.x / uOut.x * 0.85));
  vec4 t = textureLod(uTone, clamp(center / uOut, 0.0, 1.0), lod);
  float cov;
  if (ch < 0) cov = 1.0 - t.r;
  else {
    vec4 k = cmykOf(t.rgb);
    cov = ch == 0 ? k.x : ch == 1 ? k.y : ch == 2 ? k.z : k.w;
  }
  cov = clamp(cov + uGain * cov * (1.0 - cov) * 2.0, 0.0, 1.0) * step(0.5, t.a);
  float th = spotThr(cov);
  float s = spotF(l);
  float fw = max(fwidth(s), 1e-4) * 0.7 + uSoft;
  return 1.0 - smoothstep(th - fw, th + fw, s);
}
vec4 halftoneAt(vec2 p) {
  if (uCmyk == 0) {
    float cv = plate(p, uAngles.x, vec2(uOffX.x, uOffY.x), -1) * uOpac.x;
    return vec4(mix(uPaper.rgb, uInkK, cv), mix(uPaper.a, 1.0, cv));
  }
  float cC = uOpac.x > 0.0 ? plate(p, uAngles.x, vec2(uOffX.x, uOffY.x), 0) * uOpac.x : 0.0;
  float cM = uOpac.y > 0.0 ? plate(p, uAngles.y, vec2(uOffX.y, uOffY.y), 1) * uOpac.y : 0.0;
  float cY = uOpac.z > 0.0 ? plate(p, uAngles.z, vec2(uOffX.z, uOffY.z), 2) * uOpac.z : 0.0;
  float cK = uOpac.w > 0.0 ? plate(p, uAngles.w, vec2(uOffX.w, uOffY.w), 3) * uOpac.w : 0.0;
  vec3 col = uPaper.a > 0.5 ? uPaper.rgb : vec3(1.0);
  col *= mix(vec3(1.0), uInkC, cC);
  col *= mix(vec3(1.0), uInkM, cM);
  col *= mix(vec3(1.0), uInkY, cY);
  col *= mix(vec3(1.0), uInkK, cK);
  float a = uPaper.a > 0.5 ? 1.0 : 1.0 - (1.0 - cC) * (1.0 - cM) * (1.0 - cY) * (1.0 - cK);
  return vec4(col, a);
}
vec4 baseAt(vec2 p) {
  p = clamp(p, vec2(0.0), uOut - 0.001); // warp/aberration sample off-image: extend the edge
  if (uMode == 0) return gridAt(p);
  if (uMode == 1) return asciiAt(p);
  return halftoneAt(p);
}
vec2 warp(vec2 p) {
  if (uWaveAmp <= 0.0) return p;
  float a = sin(p.y / uOut.y * TAU * uWaveFreq + uWaveM.x * TAU * uPhase);
  float b = cos(p.x / uOut.x * TAU * uWaveFreq * 0.4 + uWaveM.y * TAU * uPhase);
  return p + vec2(a, b * 0.45) * uWaveAmp;
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uScale;
  vec4 c;
  if (uCaOn == 1) {
    vec2 d = p - uOut * 0.5;
    float len = length(d);
    float r01 = min(1.0, len / length(uOut * 0.5));
    float edge = 1.0 + pow(r01, 1.2) * uCaFall * 2.5;
    vec2 dir = uCaRadial == 1 ? (len > 1e-3 ? d / len : vec2(0.0)) : uCaDir;
    vec3 sh = uCaAmt * uCaMag * edge;
    vec4 cr = baseAt(warp(p + dir * sh.r));
    vec4 cg = baseAt(warp(p + dir * sh.g));
    vec4 cb = baseAt(warp(p + dir * sh.b));
    c = vec4(cr.r, cg.g, cb.b, max(max(cr.a, cg.a), cb.a));
  } else {
    c = baseAt(warp(p));
  }
  if (uShimAmt > 0.0) {
    float n;
    if (uShimBlue == 1) {
      int fr = int(floor(uPhase * uShimP));
      ivec2 ip = ivec2(floor(p / uShimScale)) + ivec2(fr * 23, fr * 41);
      n = texelFetch(uBlue, ivec2(ip.x & 63, ip.y & 63), 0).r;
    } else {
      n = vnoise(vec3(p / uShimScale, uPhase * uShimP), int(uShimP));
    }
    n = n * 2.0 - 1.0;
    float l = dot(c.rgb, vec3(0.3333));
    c.rgb *= 1.0 + n * uShimAmt * (0.35 + l * 0.95);
    if (n > 0.88 && l > 0.44) c.rgb += (n - 0.88) * 0.7 * uShimAmt;
    c.rgb = clamp(c.rgb, 0.0, 1.0);
  }
  o = c;
}`;

  const BRIGHT = COMMON + `
uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uTh; uniform float uKnee; uniform vec3 uTint;
void main() {
  vec4 s = texture(uSrc, vUv + uTexel * vec2(-0.5, -0.5)) + texture(uSrc, vUv + uTexel * vec2(0.5, -0.5))
         + texture(uSrc, vUv + uTexel * vec2(-0.5, 0.5)) + texture(uSrc, vUv + uTexel * vec2(0.5, 0.5));
  s *= 0.25;
  vec3 c = s.rgb * s.a;
  float w = smoothstep(uTh - uKnee, uTh + uKnee, luma(c));
  o = vec4(c * uTint * w, 1.0);
}`;

  const DOWN = COMMON + `
uniform sampler2D uSrc; uniform vec2 uTexel;
void main() {
  vec2 h = uTexel * 0.5;
  vec4 s = texture(uSrc, vUv) * 4.0;
  s += texture(uSrc, vUv - h);
  s += texture(uSrc, vUv + h);
  s += texture(uSrc, vUv + vec2(h.x, -h.y));
  s += texture(uSrc, vUv - vec2(h.x, -h.y));
  o = s / 8.0;
}`;

  const UP = COMMON + `
uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uSpread;
void main() {
  vec2 h = uTexel * 0.5 * uSpread;
  vec4 s = texture(uSrc, vUv + vec2(-h.x * 2.0, 0.0));
  s += texture(uSrc, vUv + vec2(-h.x, h.y)) * 2.0;
  s += texture(uSrc, vUv + vec2(0.0, h.y * 2.0));
  s += texture(uSrc, vUv + vec2(h.x, h.y)) * 2.0;
  s += texture(uSrc, vUv + vec2(h.x * 2.0, 0.0));
  s += texture(uSrc, vUv + vec2(h.x, -h.y)) * 2.0;
  s += texture(uSrc, vUv + vec2(0.0, -h.y * 2.0));
  s += texture(uSrc, vUv + vec2(-h.x, -h.y)) * 2.0;
  o = s / 12.0;
}`;

  const COMPOSITE = COMMON + `
uniform sampler2D uFx; uniform sampler2D uBloom; uniform sampler2D uHal;
uniform vec2 uOut; uniform float uScale; uniform vec2 uRes; uniform float uPhase;
uniform int uBloomOn; uniform float uBloomAmt; uniform float uHaloAmt; uniform float uBloomGrain;
uniform float uTh; uniform float uKnee; uniform vec3 uTint;
uniform int uHalOn; uniform float uHalAmt;
uniform float uGrainAmt; uniform float uGrainSize; uniform float uGrainSeed;
uniform float uVignette; uniform float uGlitch; uniform float uGlitchStep; uniform float uScan; uniform float uScanPx; uniform float uPrism;
void main() {
  vec2 uv = vUv;
  vec2 p = vec2(uv.x, 1.0 - uv.y) * uOut;
  vec4 c = texture(uFx, uv);
  if (uGlitch > 0.0) {
    int st = int(floor(uPhase * uGlitchStep));
    float bh = max(3.0, uOut.y / 36.0);
    int b1 = int(floor(p.y / bh));
    int b2 = int(floor(p.y / (bh * 4.0)));
    float r1 = h3(ivec3(b1, st, 7));
    float r2 = h3(ivec3(b2, st, 13));
    float shift = 0.0;
    if (r1 < 0.16 * uGlitch) shift += (h3(ivec3(b1, st, 11)) - 0.5) * uOut.x * 0.06 * uGlitch;
    if (r2 < 0.10 * uGlitch) shift += (h3(ivec3(b2, st, 17)) - 0.5) * uOut.x * 0.14 * uGlitch;
    if (shift != 0.0) {
      float split = 3.0 * uGlitch;
      vec4 a = texture(uFx, uv + vec2(shift / uOut.x, 0.0));
      float rr = texture(uFx, uv + vec2((shift + split) / uOut.x, 0.0)).r;
      float bb = texture(uFx, uv + vec2((shift - split) / uOut.x, 0.0)).b;
      c = vec4(rr, a.g, bb, a.a);
    }
  }
  vec3 rgb = c.rgb * c.a;
  float a = c.a;
  vec3 glow = vec3(0.0);
  if (uBloomOn == 1) {
    vec3 b = texture(uBloom, uv).rgb * uBloomAmt;
    if (uBloomGrain > 0.0) b *= max(0.0, 1.0 + (h3(ivec3(ivec2(p * uScale), int(uGrainSeed) + 91)) - 0.5) * 2.0 * uBloomGrain);
    glow += b;
    if (uHaloAmt > 0.0) glow += rgb * uTint * smoothstep(uTh - uKnee, uTh + uKnee, luma(rgb)) * uHaloAmt;
  }
  if (uHalOn == 1) glow += texture(uHal, uv).rgb * uHalAmt;
  rgb += glow;
  a = clamp(a + max(max(glow.r, glow.g), glow.b) * (1.0 - a), 0.0, 1.0);
  if (uPrism > 0.0) {
    float t = (p.x / uOut.x + p.y / uOut.y) * 0.5;
    vec3 g = mix(mix(vec3(0.557, 0.878, 1.0), vec3(1.0, 0.565, 0.882), smoothstep(0.0, 0.45, t)), vec3(0.553, 0.522, 1.0), smoothstep(0.45, 1.0, t));
    vec3 k = g * 0.3 * uPrism;
    rgb = rgb + k * a - rgb * k;
  }
  if (uScan > 0.0) {
    float f = fract(p.y / uScanPx);
    float line = smoothstep(0.35, 0.5, f) * (1.0 - smoothstep(0.85, 1.0, f));
    rgb *= 1.0 - uScan * 0.45 * line;
  }
  if (uGrainAmt > 0.0) {
    vec2 gp = p / uGrainSize;
    float n = vnoise(vec3(gp, uGrainSeed * 1.37), 0) * 0.65 + vnoise(vec3(gp * 2.13 + 17.0, uGrainSeed * 1.37 + 5.0), 0) * 0.35;
    float l = a > 0.0 ? luma(rgb / a) : 0.0;
    float w = 0.3 + 2.8 * l * (1.0 - l);
    rgb += (n - 0.5) * uGrainAmt * w * a;
  }
  if (uVignette != 0.0) {
    vec2 q = p / uOut - 0.5;
    q.x *= uOut.x / uOut.y;
    float r = length(q) / length(vec2(0.5 * uOut.x / uOut.y, 0.5));
    rgb *= 1.0 - uVignette * smoothstep(0.3, 1.05, r);
  }
  rgb = clamp(rgb, 0.0, 1.0);
  rgb = min(rgb, vec3(a));
  o = vec4(rgb, a);
}`;

  const PRESENT = COMMON + `
uniform sampler2D uFinal; uniform sampler2D uOrig; uniform int uHasOrig;
uniform vec2 uImg; uniform vec2 uView; uniform vec2 uPan; uniform float uZoom;
uniform float uSplit; uniform vec3 uViewBg; uniform vec3 uBg; uniform int uChecker; uniform float uDpr;
vec4 sampleImg(sampler2D t, vec2 ip) {
  vec2 uv;
  if (uZoom >= 1.0) {
    // sharp-bilinear: crisp pixels, anti-aliased edges at fractional zoom
    vec2 tx = ip - 0.5;
    vec2 f = fract(tx);
    vec2 i = floor(tx);
    f = clamp((f - 0.5) * uZoom + 0.5, 0.0, 1.0);
    vec2 q = i + 0.5 + f;
    uv = vec2(q.x / uImg.x, 1.0 - q.y / uImg.y);
    return textureLod(t, uv, 0.0);
  }
  uv = vec2(ip.x / uImg.x, 1.0 - ip.y / uImg.y);
  return textureLod(t, uv, log2(1.0 / uZoom));
}
void main() {
  vec2 dp = vec2(gl_FragCoord.x, uView.y - gl_FragCoord.y);
  vec2 ip = (dp - uPan) / uZoom;
  if (ip.x < 0.0 || ip.y < 0.0 || ip.x >= uImg.x || ip.y >= uImg.y) { o = vec4(uViewBg, 1.0); return; }
  bool orig = uHasOrig == 1 && uSplit > 0.0 && ip.x < uSplit * uImg.x;
  vec4 c = orig ? sampleImg(uOrig, ip) : sampleImg(uFinal, ip);
  vec3 bg = uBg;
  if (uChecker == 1) {
    vec2 cc = floor(dp / (8.0 * uDpr));
    bg = mod(cc.x + cc.y, 2.0) < 1.0 ? vec3(0.23) : vec3(0.17);
  }
  o = vec4(c.rgb + bg * (1.0 - c.a), 1.0);
}`;

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      const gl = canvas.getContext("webgl2", {
        alpha: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "high-performance"
      });
      if (!gl) throw new Error("WebGL2 is not available in this browser.");
      this.gl = gl;
      this.floatRT = !!gl.getExtension("EXT_color_buffer_float");
      this.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      this.vao = gl.createVertexArray();
      this.progs = {
        fx: this._prog(FX),
        bright: this._prog(BRIGHT),
        down: this._prog(DOWN),
        up: this._prog(UP),
        composite: this._prog(COMPOSITE),
        present: this._prog(PRESENT)
      };
      this.targets = new Map();
      // static textures
      this.tex = {};
      this.tex.grid = this._tex(1, 1, gl.NEAREST);
      this.tex.asciiData = this._tex(1, 1, gl.NEAREST);
      this.tex.atlas = this._tex(1, 1, gl.LINEAR);
      this.tex.tone = this._tex(1, 1, gl.LINEAR);
      this.tex.orig = this._tex(1, 1, gl.LINEAR);
      this.tex.black = this._tex(1, 1, gl.NEAREST);
      gl.bindTexture(gl.TEXTURE_2D, this.tex.black);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
      // spot LUT (R32F, texelFetch only)
      this.tex.spot = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.tex.spot);
      this._params(gl.NEAREST, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, 256, E.SPOTS.length, 0, gl.RED, gl.FLOAT, E.spotLUT);
      // blue noise (R8)
      this.tex.blue = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.tex.blue);
      this._params(gl.NEAREST, gl.REPEAT);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 64, 64, 0, gl.RED, gl.UNSIGNED_BYTE, Uint8Array.from(E.blueNoise, (v) => Math.round(v * 255)));
      this.gridSize = [1, 1];
      this.asciiSize = [1, 1];
      this.atlasGeo = [1, 0, 1, 1];
      this.toneSize = [1, 1];
      this.origSize = [0, 0];
      this.hasOrig = false;
    }

    /* ---------- GL helpers ---------- */
    _shader(type, src) {
      const gl = this.gl;
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s);
        throw new Error("Shader compile failed: " + log);
      }
      return s;
    }
    _prog(frag) {
      const gl = this.gl;
      const p = gl.createProgram();
      gl.attachShader(p, this._shader(gl.VERTEX_SHADER, VERT));
      gl.attachShader(p, this._shader(gl.FRAGMENT_SHADER, frag));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("Program link failed: " + gl.getProgramInfoLog(p));
      const uniforms = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(p, i);
        const name = info.name.replace(/\[0\]$/, "");
        uniforms[name] = { loc: gl.getUniformLocation(p, info.name), type: info.type };
      }
      return { p, uniforms, samplers: {} };
    }
    _use(prog, values, textures) {
      const gl = this.gl;
      gl.useProgram(prog.p);
      let unit = 0;
      for (const [name, tex] of Object.entries(textures || {})) {
        const u = prog.uniforms[name];
        if (!u) continue;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(u.loc, unit);
        unit++;
      }
      for (const [name, v] of Object.entries(values)) {
        const u = prog.uniforms[name];
        if (!u) continue;
        switch (u.type) {
          case gl.FLOAT: gl.uniform1f(u.loc, v); break;
          case gl.FLOAT_VEC2: gl.uniform2fv(u.loc, v); break;
          case gl.FLOAT_VEC3: gl.uniform3fv(u.loc, v); break;
          case gl.FLOAT_VEC4: gl.uniform4fv(u.loc, v); break;
          case gl.INT: case gl.BOOL: gl.uniform1i(u.loc, v | 0); break;
          case gl.INT_VEC2: gl.uniform2iv(u.loc, v); break;
          default: break;
        }
      }
    }
    _params(filter, wrap) {
      const gl = this.gl;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter === gl.LINEAR_MIPMAP_LINEAR ? gl.LINEAR : filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    }
    _tex(w, h, filter) {
      const gl = this.gl;
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      this._params(filter, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      return t;
    }
    _rt(w, h, float, mips) {
      const gl = this.gl;
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      const levels = mips ? Math.floor(Math.log2(Math.max(w, h))) + 1 : 1;
      gl.texStorage2D(gl.TEXTURE_2D, levels, float && this.floatRT ? gl.RGBA16F : gl.RGBA8, w, h);
      this._params(mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { tex: t, fb, w, h };
    }
    _freeRT(rt) {
      if (!rt) return;
      this.gl.deleteTexture(rt.tex);
      this.gl.deleteFramebuffer(rt.fb);
    }
    _target(w, h) {
      const key = `${w}x${h}`;
      let t = this.targets.get(key);
      if (t) {
        this.targets.delete(key);
        this.targets.set(key, t);
        return t;
      }
      t = { w, h, fx: this._rt(w, h, false, false), final: this._rt(w, h, false, true), bloom: [], hal: [] };
      let cw = w, ch = h;
      for (let i = 0; i < 9; i++) {
        cw = Math.max(1, cw >> 1);
        ch = Math.max(1, ch >> 1);
        t.bloom.push(this._rt(cw, ch, true, false));
        t.hal.push(this._rt(cw, ch, true, false));
        if (cw <= 2 || ch <= 2) break;
      }
      this.targets.set(key, t);
      while (this.targets.size > 2) {
        const [k, old] = this.targets.entries().next().value;
        this.targets.delete(k);
        this._freeRT(old.fx);
        this._freeRT(old.final);
        old.bloom.forEach((r) => this._freeRT(r));
        old.hal.forEach((r) => this._freeRT(r));
      }
      return t;
    }
    _draw(rt) {
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, rt ? rt.fb : null);
      if (rt) gl.viewport(0, 0, rt.w, rt.h);
      gl.bindVertexArray(this.vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    /* ---------- uploads ---------- */
    setGrid(rgba, w, h) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.tex.grid);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
      this.gridSize = [w, h];
    }
    setAscii(data, cols, rows) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.tex.asciiData);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
      this.asciiSize = [cols, rows];
    }
    setAtlas(atlas) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.tex.atlas);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
      this._params(gl.LINEAR, gl.CLAMP_TO_EDGE);
      this.atlasGeo = [atlas.slotW, atlas.pad, atlas.canvas.width, atlas.canvas.height];
    }
    setTone(rgba, w, h) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.tex.tone);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
      this._params(gl.LINEAR_MIPMAP_LINEAR, gl.CLAMP_TO_EDGE);
      gl.generateMipmap(gl.TEXTURE_2D);
      this.toneSize = [w, h];
    }
    setOriginal(source) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.tex.orig);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      this._params(gl.LINEAR_MIPMAP_LINEAR, gl.CLAMP_TO_EDGE);
      gl.generateMipmap(gl.TEXTURE_2D);
      this.origSize = [source.width, source.height];
      this.hasOrig = true;
    }

    /* ---------- render ---------- */
    // P: flat param object built by the app. scale: export multiplier.
    renderImage(P, scale = 1) {
      const gl = this.gl;
      const W = Math.max(1, Math.round(P.outW * scale));
      const H = Math.max(1, Math.round(P.outH * scale));
      const T = this._target(W, H);
      gl.disable(gl.BLEND);

      // 1. base + FX
      this._use(
        this.progs.fx,
        {
          uRes: [W, H], uScale: scale, uOut: [P.outW, P.outH], uMode: P.mode, uPhase: P.phase,
          uGridSize: this.gridSize, uPixel: P.pixel,
          uAsciiGrid: this.asciiSize, uCell: P.cell, uAtlasGeo: this.atlasGeo, uAsciiBg: P.asciiBg,
          uToneSize: this.toneSize, uShape: P.shape, uCellPx: P.cellPx, uCmyk: P.cmyk,
          uAngles: P.angles, uOpac: P.opac, uOffX: P.offX, uOffY: P.offY,
          uInkC: P.inks[0], uInkM: P.inks[1], uInkY: P.inks[2], uInkK: P.inks[3], uPaper: P.paper,
          uSoft: P.soft, uGain: P.gain, uGcr: P.gcr,
          uWaveAmp: P.waveAmp, uWaveFreq: P.waveFreq, uWaveM: P.waveM,
          uCaOn: P.caOn, uCaRadial: P.caRadial, uCaAmt: P.caAmt, uCaDir: P.caDir, uCaFall: P.caFall, uCaMag: P.caMag,
          uShimAmt: P.shimAmt, uShimScale: P.shimScale, uShimP: P.shimP, uShimBlue: P.shimBlue
        },
        {
          uGrid: this.tex.grid, uAsciiData: this.tex.asciiData, uAtlas: this.tex.atlas,
          uTone: this.tex.tone, uSpotLut: this.tex.spot, uBlue: this.tex.blue
        }
      );
      this._draw(T.fx);

      // 2. bloom + halation chains
      const extra = Math.round(Math.log2(Math.max(1, scale)));
      const runChain = (chain, th, knee, tint, levels, spread) => {
        const n = Math.max(1, Math.min(chain.length, levels + extra));
        this._use(this.progs.bright, { uTexel: [1 / W, 1 / H], uTh: th, uKnee: knee, uTint: tint }, { uSrc: T.fx.tex });
        this._draw(chain[0]);
        for (let i = 1; i < n; i++) {
          this._use(this.progs.down, { uTexel: [1 / chain[i - 1].w, 1 / chain[i - 1].h] }, { uSrc: chain[i - 1].tex });
          this._draw(chain[i]);
        }
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        for (let i = n - 1; i > 0; i--) {
          this._use(this.progs.up, { uTexel: [1 / chain[i].w, 1 / chain[i].h], uSpread: spread }, { uSrc: chain[i].tex });
          this._draw(chain[i - 1]);
        }
        gl.disable(gl.BLEND);
        return n;
      };
      let bloomN = 1, halN = 1;
      if (P.bloomOn) bloomN = runChain(T.bloom, P.bloomTh, P.bloomKnee, P.bloomTint, P.bloomLevels, P.bloomSpread);
      if (P.halOn) halN = runChain(T.hal, P.halTh, P.halKnee, P.halTint, P.halLevels, 1.0);

      // 3. composite
      this._use(
        this.progs.composite,
        {
          uOut: [P.outW, P.outH], uScale: scale, uRes: [W, H], uPhase: P.phase,
          uBloomOn: P.bloomOn ? 1 : 0, uBloomAmt: (P.bloomAmt * 2.2) / (bloomN + 1), uHaloAmt: P.haloAmt, uBloomGrain: P.bloomGrain,
          uTh: P.bloomTh, uKnee: P.bloomKnee, uTint: P.bloomTint,
          uHalOn: P.halOn ? 1 : 0, uHalAmt: (P.halAmt * 2.2) / (halN + 1),
          uGrainAmt: P.grainAmt, uGrainSize: P.grainSize, uGrainSeed: P.grainSeed,
          uVignette: P.vignette, uGlitch: P.glitch, uGlitchStep: P.glitchStep, uScan: P.scan, uScanPx: P.scanPx, uPrism: P.prism
        },
        {
          uFx: T.fx.tex,
          uBloom: P.bloomOn ? T.bloom[0].tex : this.tex.black,
          uHal: P.halOn ? T.hal[0].tex : this.tex.black
        }
      );
      this._draw(T.final);
      return T;
    }

    // Draw a rendered target into the on-screen canvas with pan/zoom/split.
    present(T, V) {
      const gl = this.gl;
      if (T) {
        gl.bindTexture(gl.TEXTURE_2D, T.final.tex);
        gl.generateMipmap(gl.TEXTURE_2D);
      }
      this.lastTarget = T || this.lastTarget;
      const tgt = this.lastTarget;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      if (!tgt) {
        gl.clearColor(V.viewBg[0], V.viewBg[1], V.viewBg[2], 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        return;
      }
      this._use(
        this.progs.present,
        {
          uHasOrig: this.hasOrig && V.split > 0 ? 1 : 0, uImg: [tgt.w, tgt.h], uView: [this.canvas.width, this.canvas.height],
          uPan: V.pan, uZoom: V.zoom, uSplit: V.split, uViewBg: V.viewBg, uBg: V.bg, uChecker: V.checker ? 1 : 0, uDpr: V.dpr
        },
        { uFinal: tgt.final.tex, uOrig: this.hasOrig ? this.tex.orig : this.tex.black }
      );
      gl.bindVertexArray(this.vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // Read the final target as straight-alpha, top-down RGBA bytes.
    // flatten: [r,g,b] 0..255 — composite over that colour and return opaque pixels (for video).
    read(T, flatten = null) {
      const gl = this.gl;
      const { w, h } = T;
      const buf = new Uint8Array(w * h * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, T.final.fb);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const out = new Uint8ClampedArray(w * h * 4);
      const row = w * 4;
      for (let y = 0; y < h; y++) {
        const src = (h - 1 - y) * row;
        const dst = y * row;
        for (let x = 0; x < row; x += 4) {
          const a = buf[src + x + 3];
          if (flatten) {
            const k = 1 - a / 255;
            out[dst + x] = buf[src + x] + flatten[0] * k;
            out[dst + x + 1] = buf[src + x + 1] + flatten[1] * k;
            out[dst + x + 2] = buf[src + x + 2] + flatten[2] * k;
            out[dst + x + 3] = 255;
            continue;
          }
          if (a === 255) {
            out[dst + x] = buf[src + x];
            out[dst + x + 1] = buf[src + x + 1];
            out[dst + x + 2] = buf[src + x + 2];
          } else if (a > 0) {
            const k = 255 / a;
            out[dst + x] = buf[src + x] * k;
            out[dst + x + 1] = buf[src + x + 1] * k;
            out[dst + x + 2] = buf[src + x + 2] * k;
          }
          out[dst + x + 3] = a;
        }
      }
      return new ImageData(out, w, h);
    }
  }

  DL.Renderer = Renderer;

  /* ---------- ASCII glyph atlas ---------- */
  DL.buildAtlas = (charset, cellW, cellH, font, weight, supersample, sortByDensity = true) => {
    const S = Math.max(1, Math.min(8, supersample));
    const chars = [" "];
    for (const ch of charset) if (ch !== " " && !chars.includes(ch) && chars.length < 250) chars.push(ch);
    const pad = 2;
    const gw = Math.max(2, Math.round(cellW * S));
    const gh = Math.max(2, Math.round(cellH * S));
    const slotW = gw + pad * 2;
    const c = document.createElement("canvas");
    c.width = slotW * chars.length;
    c.height = gh + pad * 2;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    const px = gh * 0.9;
    ctx.font = `${weight === "bold" ? 700 : 400} ${px}px ${font}, Menlo, monospace`;
    const mW = ctx.measureText("M").width || px * 0.6;
    const sx = Math.min(1.25, gw / mW);
    chars.forEach((ch, i) => {
      if (i === 0) return;
      ctx.save();
      ctx.translate(i * slotW + pad + gw / 2, pad + gh / 2 + gh * 0.04);
      ctx.scale(sx, 1);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    });
    // density per glyph for tone ordering
    const img = ctx.getImageData(0, 0, c.width, c.height).data;
    const density = chars.map((_, i) => {
      let sum = 0;
      for (let y = 0; y < c.height; y++)
        for (let x = i * slotW; x < (i + 1) * slotW; x++) sum += img[(y * c.width + x) * 4 + 3];
      return sum;
    });
    // tone ramp: light → dense. Either measured density or the order the user typed.
    let order;
    if (sortByDensity) {
      order = chars.map((_, i) => i).filter((i) => i > 0 || charset.includes(" "));
      order.sort((a, b) => density[a] - density[b]);
    } else {
      order = [];
      for (const ch of charset) {
        const i = chars.indexOf(ch);
        if (i >= 0 && !order.includes(i)) order.push(i);
      }
    }
    if (order.length < 2) order = [0, Math.max(1, chars.length - 1)];
    return { canvas: c, chars, order, slotW, pad, n: chars.length, density };
  };
})();
