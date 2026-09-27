/* Dither Lab — shared math + color utilities. Classic script (works from file://). */
(() => {
  const DL = (window.DL = window.DL || {});
  const U = (DL.util = {});

  U.clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  U.clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.smoothstep = (e0, e1, x) => {
    if (e0 === e1) return x < e0 ? 0 : 1;
    const t = U.clamp01((x - e0) / (e1 - e0));
    return t * t * (3 - 2 * t);
  };
  U.fract = (v) => v - Math.floor(v);

  /* ---------- hex / rgb ---------- */
  U.hexToRgb = (hex) => {
    let s = String(hex || "#000").trim().replace(/^#/, "");
    if (s.length === 3) s = s.split("").map((c) => c + c).join("");
    const n = Number.parseInt(s.slice(0, 6), 16);
    if (!Number.isFinite(n)) return [0, 0, 0];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.rgbToHex = (rgb) =>
    "#" + rgb.map((v) => U.clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("");
  U.normalizeHex = (hex) => U.rgbToHex(U.hexToRgb(hex));
  U.isHex = (s) => /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(s).trim());
  U.parseHexList = (text) =>
    (String(text || "").match(/#?[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi) || []).map((h) =>
      U.normalizeHex(h.startsWith("#") ? h : "#" + h)
    );

  /* ---------- sRGB transfer ---------- */
  const S2L = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const c = i / 255;
    S2L[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  U.S2L = S2L;
  U.srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  U.linearToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  // 4096-entry encode LUT over linear [0,1]
  const L2S_N = 4096;
  const L2S = new Float32Array(L2S_N + 1);
  for (let i = 0; i <= L2S_N; i++) L2S[i] = U.linearToSrgb(i / L2S_N);
  U.l2sFast = (c) => (c <= 0 ? 0 : c >= 1 ? 1 : L2S[(c * L2S_N + 0.5) | 0]);
  const S2L_N = 4096;
  const S2LF = new Float32Array(S2L_N + 1);
  for (let i = 0; i <= S2L_N; i++) S2LF[i] = U.srgbToLinear(i / S2L_N);
  U.s2lFast = (c) => (c <= 0 ? 0 : c >= 1 ? 1 : S2LF[(c * S2L_N + 0.5) | 0]);

  /* ---------- OKLab / OKLCH ---------- */
  // linear rgb (0..1) -> oklab
  U.linToOklab = (r, g, b) => {
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
    ];
  };
  U.oklabToLin = (L, a, b) => {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
    ];
  };
  U.rgbToOklab = (rgb) => U.linToOklab(S2L[rgb[0] | 0], S2L[rgb[1] | 0], S2L[rgb[2] | 0]);
  U.oklabToRgb = (lab) => {
    const lin = U.oklabToLin(lab[0], lab[1], lab[2]);
    return lin.map((c) => U.clamp(Math.round(U.linearToSrgb(U.clamp01(c)) * 255), 0, 255));
  };
  U.hexToOklch = (hex) => {
    const [L, a, b] = U.rgbToOklab(U.hexToRgb(hex));
    let h = (Math.atan2(b, a) * 180) / Math.PI;
    if (h < 0) h += 360;
    return [L, Math.hypot(a, b), h];
  };
  U.oklchToHex = (L, C, h) => {
    const r = (h * Math.PI) / 180;
    // gamut-map by reducing chroma until in range
    let c = C;
    for (let i = 0; i < 24; i++) {
      const lin = U.oklabToLin(L, c * Math.cos(r), c * Math.sin(r));
      if (lin.every((v) => v >= -0.0005 && v <= 1.0005)) break;
      c *= 0.92;
    }
    return U.rgbToHex(U.oklabToRgb([L, c * Math.cos(r), c * Math.sin(r)]));
  };
  // Rec.709 luma on gamma-encoded values (0..1)
  U.luma = (rgb) => (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  U.lumaLinear = (rgb) => 0.2126 * S2L[rgb[0]] + 0.7152 * S2L[rgb[1]] + 0.0722 * S2L[rgb[2]];

  // Interpolate a list of hex anchors to n colours in OKLab (perceptually even ramp).
  U.rampOklab = (hexes, n) => {
    const labs = hexes.map((h) => U.rgbToOklab(U.hexToRgb(h)));
    if (labs.length === 1) return Array.from({ length: n }, () => hexes[0]);
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      const seg = t * (labs.length - 1);
      const k = Math.min(labs.length - 2, Math.floor(seg));
      const f = seg - k;
      const A = labs[k], B = labs[k + 1];
      out.push(U.rgbToHex(U.oklabToRgb([U.lerp(A[0], B[0], f), U.lerp(A[1], B[1], f), U.lerp(A[2], B[2], f)])));
    }
    return out;
  };

  /* ---------- RNG / hash ---------- */
  U.mulberry32 = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  // integer hash -> [0,1)
  U.hash3 = (x, y, z) => {
    let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(z | 0, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };

  /* ---------- monotone cubic curve (Fritsch–Carlson) ---------- */
  U.curveLUT = (points, size = 1024) => {
    const pts = points
      .map((p) => [U.clamp01(p[0]), U.clamp01(p[1])])
      .sort((a, b) => a[0] - b[0]);
    const lut = new Float32Array(size);
    if (pts.length < 2) {
      for (let i = 0; i < size; i++) lut[i] = i / (size - 1);
      return lut;
    }
    const n = pts.length;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const d = new Array(n - 1);
    const m = new Array(n);
    for (let i = 0; i < n - 1; i++) {
      const dx = xs[i + 1] - xs[i];
      d[i] = dx > 1e-6 ? (ys[i + 1] - ys[i]) / dx : 0;
    }
    m[0] = d[0];
    m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) {
        m[i] = 0;
        m[i + 1] = 0;
        continue;
      }
      const a = m[i] / d[i];
      const b = m[i + 1] / d[i];
      const s = a * a + b * b;
      if (s > 9) {
        const t = 3 / Math.sqrt(s);
        m[i] = t * a * d[i];
        m[i + 1] = t * b * d[i];
      }
    }
    let seg = 0;
    for (let i = 0; i < size; i++) {
      const x = i / (size - 1);
      if (x <= xs[0]) {
        lut[i] = ys[0];
        continue;
      }
      if (x >= xs[n - 1]) {
        lut[i] = ys[n - 1];
        continue;
      }
      while (seg < n - 2 && x > xs[seg + 1]) seg++;
      const h = xs[seg + 1] - xs[seg];
      const t = h > 1e-6 ? (x - xs[seg]) / h : 0;
      const t2 = t * t, t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
      lut[i] = U.clamp01(h00 * ys[seg] + h10 * h * m[seg] + h01 * ys[seg + 1] + h11 * h * m[seg + 1]);
    }
    return lut;
  };

  /* ---------- misc ---------- */
  U.debounce = (fn, ms) => {
    let t = 0;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };
  U.fmtTime = (s) => {
    if (!Number.isFinite(s)) return "--:--";
    const m = Math.floor(s / 60);
    const r = s - m * 60;
    return `${String(m).padStart(2, "0")}:${r.toFixed(2).padStart(5, "0")}`;
  };
  U.slug = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "untitled";
  U.deepClone = (o) => JSON.parse(JSON.stringify(o));
  U.escapeXml = (t) =>
    String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  U.downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  U.nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  U.wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // Yield to the event loop without timer throttling (keeps exports running in background tabs).
  const chan = new MessageChannel();
  const queue = [];
  chan.port1.onmessage = () => queue.shift()();
  U.yieldTask = () => new Promise((r) => (queue.push(r), chan.port2.postMessage(0)));
  // Give the UI a chance to paint (e.g. a progress overlay) but never hang if rAF is paused.
  U.breathe = () => Promise.race([U.nextFrame(), U.wait(50)]);
})();
