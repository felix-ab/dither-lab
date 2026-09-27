/* Dither Lab — CPU engine: tone stage, dithering, ASCII data, palette tools. */
(() => {
  const DL = window.DL;
  const U = DL.util;
  const E = (DL.engine = {});

  /* ---------- threshold matrices ---------- */
  E.bayer = (n) => {
    let m = [0];
    let size = 1;
    while (size < n) {
      const s2 = size * 2;
      const next = new Array(s2 * s2);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const v = m[y * size + x] * 4;
          next[y * s2 + x] = v;
          next[y * s2 + x + size] = v + 2;
          next[(y + size) * s2 + x] = v + 3;
          next[(y + size) * s2 + x + size] = v + 1;
        }
      }
      m = next;
      size = s2;
    }
    return Float32Array.from(m, (v) => (v + 0.5) / (n * n));
  };
  const BAYER = { 2: E.bayer(2), 4: E.bayer(4), 8: E.bayer(8), 16: E.bayer(16) };

  // Void-and-cluster blue noise (Ulichney). Deterministic; ~30 ms for 64×64.
  E.makeBlueNoise = (N = 64, seed = 7) => {
    const size = N * N;
    const R = 6;
    const sigma = 1.9;
    const KW = 2 * R + 1;
    const K = new Float32Array(KW * KW);
    for (let dy = -R; dy <= R; dy++)
      for (let dx = -R; dx <= R; dx++) K[(dy + R) * KW + dx + R] = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
    const mk = () => ({ bits: new Uint8Array(size), energy: new Float32Array(size) });
    const splat = (st, idx, sign) => {
      const x = idx % N, y = (idx / N) | 0;
      for (let dy = -R; dy <= R; dy++) {
        const yy = ((y + dy + N) % N) * N;
        for (let dx = -R; dx <= R; dx++) st.energy[yy + ((x + dx + N) % N)] += sign * K[(dy + R) * KW + dx + R];
      }
    };
    const cluster = (st) => {
      let best = -1, bv = -Infinity;
      for (let i = 0; i < size; i++) if (st.bits[i] && st.energy[i] > bv) (bv = st.energy[i]), (best = i);
      return best;
    };
    const voidOf = (st) => {
      let best = -1, bv = Infinity;
      for (let i = 0; i < size; i++) if (!st.bits[i] && st.energy[i] < bv) (bv = st.energy[i]), (best = i);
      return best;
    };
    const rng = U.mulberry32(seed);
    const st = mk();
    const initCount = Math.floor(size * 0.1);
    let placed = 0;
    while (placed < initCount) {
      const i = (rng() * size) | 0;
      if (!st.bits[i]) {
        st.bits[i] = 1;
        splat(st, i, 1);
        placed++;
      }
    }
    for (let it = 0; it < size; it++) {
      const c = cluster(st);
      st.bits[c] = 0;
      splat(st, c, -1);
      const v = voidOf(st);
      st.bits[v] = 1;
      splat(st, v, 1);
      if (v === c) break;
    }
    const rank = new Int32Array(size);
    const a = { bits: st.bits.slice(), energy: st.energy.slice() };
    for (let r = initCount - 1; r >= 0; r--) {
      const c = cluster(a);
      a.bits[c] = 0;
      splat(a, c, -1);
      rank[c] = r;
    }
    for (let r = initCount; r < size; r++) {
      const v = voidOf(st);
      st.bits[v] = 1;
      splat(st, v, 1);
      rank[v] = r;
    }
    return Float32Array.from(rank, (r) => (r + 0.5) / size);
  };
  E.BN_SIZE = 64;
  E.blueNoise = E.makeBlueNoise(64, 7);

  /* ---------- error-diffusion kernels: [dx, dy, weight] ---------- */
  E.KERNELS = {
    "floyd-steinberg": { label: "Floyd–Steinberg", div: 16, taps: [[1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]] },
    atkinson: { label: "Atkinson", div: 8, taps: [[1, 0, 1], [2, 0, 1], [-1, 1, 1], [0, 1, 1], [1, 1, 1], [0, 2, 1]] },
    jarvis: {
      label: "Jarvis–Judice–Ninke",
      div: 48,
      taps: [[1, 0, 7], [2, 0, 5], [-2, 1, 3], [-1, 1, 5], [0, 1, 7], [1, 1, 5], [2, 1, 3], [-2, 2, 1], [-1, 2, 3], [0, 2, 5], [1, 2, 3], [2, 2, 1]]
    },
    stucki: {
      label: "Stucki",
      div: 42,
      taps: [[1, 0, 8], [2, 0, 4], [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2], [-2, 2, 1], [-1, 2, 2], [0, 2, 4], [1, 2, 2], [2, 2, 1]]
    },
    burkes: { label: "Burkes", div: 32, taps: [[1, 0, 8], [2, 0, 4], [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2]] },
    sierra: {
      label: "Sierra",
      div: 32,
      taps: [[1, 0, 5], [2, 0, 3], [-2, 1, 2], [-1, 1, 4], [0, 1, 5], [1, 1, 4], [2, 1, 2], [-1, 2, 2], [0, 2, 3], [1, 2, 2]]
    },
    "sierra-2": { label: "Two-Row Sierra", div: 16, taps: [[1, 0, 4], [2, 0, 3], [-2, 1, 1], [-1, 1, 2], [0, 1, 3], [1, 1, 2], [2, 1, 1]] },
    "sierra-lite": { label: "Sierra Lite", div: 4, taps: [[1, 0, 2], [-1, 1, 1], [0, 1, 1]] }
  };

  /* ---------- tone stage ---------- */
  // Input black/white point -> contrast S-curve -> user curve. Returns 1024-entry LUT.
  E.buildToneLUT = (s) => {
    const N = 1024;
    const curve = U.curveLUT(s.curve || [[0, 0], [1, 1]], N);
    const bp = s.blackPoint / 100;
    const wp = Math.max(bp + 0.01, s.whitePoint / 100);
    const k = Math.pow(2, (s.contrast / 100) * 1.6);
    const lut = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      let v = U.clamp01((i / (N - 1) - bp) / (wp - bp));
      if (k !== 1 && v > 0 && v < 1) {
        const a = Math.pow(v, k);
        v = a / (a + Math.pow(1 - v, k));
      }
      const f = v * (N - 1);
      const i0 = f | 0;
      const i1 = Math.min(N - 1, i0 + 1);
      lut[i] = curve[i0] + (curve[i1] - curve[i0]) * (f - i0);
    }
    return lut;
  };
  const applyLUT = (lut, v) => {
    const f = (v <= 0 ? 0 : v >= 1 ? 1 : v) * 1023;
    const i = f | 0;
    return i >= 1023 ? lut[1023] : lut[i] + (lut[i + 1] - lut[i]) * (f - i);
  };

  function blur121(src, w, h, stride, off, out, tmp) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const xl = x > 0 ? x - 1 : 0, xr = x < w - 1 ? x + 1 : w - 1;
        tmp[row + x] = (src[(row + xl) * stride + off] + 2 * src[(row + x) * stride + off] + src[(row + xr) * stride + off]) * 0.25;
      }
    }
    for (let y = 0; y < h; y++) {
      const yu = y > 0 ? y - 1 : 0, yd = y < h - 1 ? y + 1 : h - 1;
      for (let x = 0; x < w; x++) out[y * w + x] = (tmp[yu * w + x] + 2 * tmp[y * w + x] + tmp[yd * w + x]) * 0.25;
    }
  }
  // Unsharp (amount > 0) or soften (amount < 0) a channel in-place.
  function applyDetail(arr, w, h, stride, off, amount) {
    const n = w * h;
    const b = new Float32Array(n), tmp = new Float32Array(n);
    blur121(arr, w, h, stride, off, b, tmp);
    blur121(b, w, h, 1, 0, b, tmp);
    if (amount > 0) {
      const k = amount * 2.5;
      for (let i = 0; i < n; i++) {
        const v = arr[i * stride + off];
        arr[i * stride + off] = v + k * (v - b[i]);
      }
    } else {
      const k = -amount;
      for (let i = 0; i < n; i++) {
        const v = arr[i * stride + off];
        arr[i * stride + off] = v + (b[i] - v) * k;
      }
    }
  }

  // imageData -> { L, RGB|null, A, hist, w, h }. Working space is gamma sRGB unless linearLight.
  E.tone = (img, s, needColor) => {
    const w = img.width, h = img.height, n = w * h, d = img.data;
    const L = new Float32Array(n);
    const A = new Float32Array(n);
    const RGB = needColor ? new Float32Array(n * 3) : null;
    const hist = new Uint32Array(64);
    const S2L = U.S2L;
    const ev = Math.pow(2, s.exposure || 0);
    const lin = !!s.linearLight;
    const sat = (s.saturation ?? 100) / 100;
    const hue = ((s.hue || 0) * Math.PI) / 180;
    const colorAdj = needColor && (sat !== 1 || hue !== 0);
    const ch = Math.cos(hue), sh = Math.sin(hue);
    const fast = !lin && ev === 1 && !needColor;
    for (let p = 0, i = 0; p < n; p++, i += 4) {
      A[p] = d[i + 3] / 255;
      if (fast) {
        const y = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
        L[p] = y;
        hist[Math.min(63, (y * 64) | 0)]++;
        continue;
      }
      let r = S2L[d[i]] * ev, g = S2L[d[i + 1]] * ev, b = S2L[d[i + 2]] * ev;
      if (colorAdj) {
        const lab = U.linToOklab(r, g, b);
        const a2 = (lab[1] * ch - lab[2] * sh) * sat;
        const b2 = (lab[1] * sh + lab[2] * ch) * sat;
        const o = U.oklabToLin(lab[0], a2, b2);
        r = o[0] < 0 ? 0 : o[0];
        g = o[1] < 0 ? 0 : o[1];
        b = o[2] < 0 ? 0 : o[2];
      }
      let y;
      if (lin) {
        r = r > 1 ? 1 : r;
        g = g > 1 ? 1 : g;
        b = b > 1 ? 1 : b;
        y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      } else {
        r = U.l2sFast(r);
        g = U.l2sFast(g);
        b = U.l2sFast(b);
        y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }
      L[p] = y;
      hist[Math.min(63, (y * 64) | 0)]++;
      if (RGB) {
        RGB[p * 3] = r;
        RGB[p * 3 + 1] = g;
        RGB[p * 3 + 2] = b;
      }
    }
    const detail = (s.detail || 0) / 100;
    if (detail !== 0 && w > 2 && h > 2) {
      applyDetail(L, w, h, 1, 0, detail);
      if (RGB) for (let c = 0; c < 3; c++) applyDetail(RGB, w, h, 3, c, detail);
    }
    const lut = E.buildToneLUT(s);
    const inv = !!s.invert;
    for (let p = 0; p < n; p++) {
      const v = applyLUT(lut, L[p]);
      L[p] = inv ? 1 - v : v;
    }
    if (RGB) {
      for (let q = 0; q < n * 3; q++) {
        const v = applyLUT(lut, RGB[q]);
        RGB[q] = inv ? 1 - v : v;
      }
    }
    return { L, RGB, A, hist, w, h };
  };

  /* ---------- palette ---------- */
  E.resolvePalette = (s) => {
    let hexes = (s.palette || []).filter(U.isHex).map(U.normalizeHex);
    if (!hexes.length) hexes = ["#000000", "#ffffff"];
    if (hexes.length === 1) hexes = [hexes[0], hexes[0]];
    if (s.levels >= 2 && s.levels !== hexes.length) hexes = U.rampOklab(hexes, s.levels);
    const rgb = hexes.map(U.hexToRgb);
    const lum = rgb.map((c) => (s.linearLight ? U.lumaLinear(c) : U.luma(c)));
    let darkest = 0, lightest = 0;
    lum.forEach((v, i) => {
      if (v < lum[darkest]) darkest = i;
      if (v > lum[lightest]) lightest = i;
    });
    return { hexes, rgb, lum, darkest, lightest };
  };

  // Tone-map ordering: order[k] = palette index at ramp position k; pos[k] in [0,1].
  E.tonePositions = (pal, s) => {
    const n = pal.rgb.length;
    const order = [...Array(n).keys()];
    let pos;
    if (s.matchLightness) {
      order.sort((a, b) => pal.lum[a] - pal.lum[b]);
      const lo = pal.lum[order[0]], hi = pal.lum[order[n - 1]];
      pos = order.map((i, k) => (hi - lo > 1e-6 ? (pal.lum[i] - lo) / (hi - lo) : k / Math.max(1, n - 1)));
    } else {
      pos = order.map((_, k) => k / Math.max(1, n - 1));
    }
    return { order, pos: Float32Array.from(pos) };
  };

  const nearestPos = (pos, v) => {
    const n = pos.length;
    let best = 0, bd = Infinity;
    for (let k = 0; k < n; k++) {
      const d = Math.abs(v - pos[k]);
      if (d < bd) (bd = d), (best = k);
    }
    return best;
  };

  function thresholdFn(s, frame) {
    const seed = (s.seed | 0) + (s.crawl ? frame * 7919 : 0);
    if (s.mode === "ordered") {
      const n = [2, 4, 8, 16].includes(+s.bayerSize) ? +s.bayerSize : 8;
      const M = BAYER[n];
      const ox = s.crawl ? (frame * 3) % n : 0;
      const oy = s.crawl ? (frame * 5) % n : 0;
      return (x, y) => M[((y + oy) % n) * n + ((x + ox) % n)];
    }
    if (s.mode === "bluenoise") {
      const BN = E.blueNoise;
      const ox = Math.floor(U.hash3(seed, 1, 3) * 64);
      const oy = Math.floor(U.hash3(seed, 2, 5) * 64);
      return (x, y) => BN[((y + oy) & 63) * 64 + ((x + ox) & 63)];
    }
    if (s.mode === "random") return (x, y) => U.hash3(x, y, seed);
    const t = U.clamp01((s.threshold ?? 50) / 100);
    return () => t;
  }

  /* ---------- tone-mode dithers (output: ramp position index per pixel) ---------- */
  function diffuseTone(L, w, h, pos, s, frame) {
    const n = w * h;
    const out = new Uint8Array(n);
    const work = Float32Array.from(L);
    const K = E.KERNELS[s.kernel] || E.KERNELS["floyd-steinberg"];
    const taps = K.taps, T = taps.length;
    const wts = Float32Array.from(taps, (t) => t[2] / K.div);
    const amt = (s.diffusion ?? 100) / 100;
    const serp = s.serpentine !== false;
    const jitter = s.crawl ? 0.035 : 0;
    const seed = (s.seed | 0) + frame * 7919;
    const even = !s.matchLightness;
    const np = pos.length, scale = np - 1;
    for (let y = 0; y < h; y++) {
      const rev = serp && (y & 1);
      for (let xx = 0; xx < w; xx++) {
        const x = rev ? w - 1 - xx : xx;
        const i = y * w + x;
        let v = work[i];
        if (jitter) v += (U.hash3(x, y, seed) - 0.5) * jitter;
        let k;
        if (even) {
          k = Math.round(v * scale);
          k = k < 0 ? 0 : k > scale ? scale : k;
        } else k = nearestPos(pos, v);
        out[i] = k;
        const err = (v - pos[k]) * amt;
        if (err === 0) continue;
        for (let t = 0; t < T; t++) {
          const nx = x + (rev ? -taps[t][0] : taps[t][0]);
          const ny = y + taps[t][1];
          if (nx < 0 || nx >= w || ny >= h) continue;
          work[ny * w + nx] += err * wts[t];
        }
      }
    }
    return out;
  }

  function thresholdTone(L, w, h, pos, s, frame) {
    const out = new Uint8Array(w * h);
    const thr = thresholdFn(s, frame);
    const spread = s.mode === "threshold" ? 1 : (s.spread ?? 100) / 100;
    const np = pos.length;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const v = L[i];
        let k;
        if (v <= pos[0]) k = 0;
        else if (v >= pos[np - 1]) k = np - 1;
        else {
          k = 0;
          while (k < np - 2 && v >= pos[k + 1]) k++;
          const span = pos[k + 1] - pos[k];
          const f = span > 1e-6 ? (v - pos[k]) / span : 0.5;
          const t = s.mode === "threshold" ? thr(x, y) : 0.5 + (thr(x, y) - 0.5) * spread;
          if (f > t) k++;
        }
        out[i] = k;
      }
    }
    return out;
  }

  /* ---------- nearest-colour dithers (output: palette index per pixel) ---------- */
  function makeNearest(pal, lin) {
    const labs = pal.rgb.map((c) => U.rgbToOklab(c));
    const np = labs.length;
    const cache = new Int8Array(64 * 64 * 64).fill(-1);
    return (r, g, b) => {
      const ri = (r <= 0 ? 0 : r >= 1 ? 63 : (r * 63 + 0.5) | 0);
      const gi = (g <= 0 ? 0 : g >= 1 ? 63 : (g * 63 + 0.5) | 0);
      const bi = (b <= 0 ? 0 : b >= 1 ? 63 : (b * 63 + 0.5) | 0);
      const key = (ri << 12) | (gi << 6) | bi;
      const c = cache[key];
      if (c >= 0) return c;
      const rr = ri / 63, gg = gi / 63, bb = bi / 63;
      const lab = lin ? U.linToOklab(rr, gg, bb) : U.linToOklab(U.s2lFast(rr), U.s2lFast(gg), U.s2lFast(bb));
      let best = 0, bd = Infinity;
      for (let k = 0; k < np; k++) {
        const P = labs[k];
        const dl = lab[0] - P[0], da = lab[1] - P[1], db = lab[2] - P[2];
        const dd = dl * dl + da * da + db * db;
        if (dd < bd) (bd = dd), (best = k);
      }
      cache[key] = best;
      return best;
    };
  }
  const palWorking = (pal, lin) =>
    pal.rgb.map((c) => (lin ? [U.S2L[c[0]], U.S2L[c[1]], U.S2L[c[2]]] : [c[0] / 255, c[1] / 255, c[2] / 255]));

  function diffuseColor(RGB, w, h, pal, s, frame) {
    const n = w * h;
    const lin = !!s.linearLight;
    const nearest = makeNearest(pal, lin);
    const P = palWorking(pal, lin);
    const out = new Uint8Array(n);
    const work = Float32Array.from(RGB);
    const K = E.KERNELS[s.kernel] || E.KERNELS["floyd-steinberg"];
    const taps = K.taps, T = taps.length;
    const wts = Float32Array.from(taps, (t) => t[2] / K.div);
    const amt = (s.diffusion ?? 100) / 100;
    const serp = s.serpentine !== false;
    const jitter = s.crawl ? 0.03 : 0;
    const seed = (s.seed | 0) + frame * 7919;
    for (let y = 0; y < h; y++) {
      const rev = serp && (y & 1);
      for (let xx = 0; xx < w; xx++) {
        const x = rev ? w - 1 - xx : xx;
        const i = y * w + x, o = i * 3;
        let r = work[o], g = work[o + 1], b = work[o + 2];
        if (jitter) {
          const j = (U.hash3(x, y, seed) - 0.5) * jitter;
          r += j;
          g += j;
          b += j;
        }
        const k = nearest(r, g, b);
        out[i] = k;
        const er = (r - P[k][0]) * amt, eg = (g - P[k][1]) * amt, eb = (b - P[k][2]) * amt;
        for (let t = 0; t < T; t++) {
          const nx = x + (rev ? -taps[t][0] : taps[t][0]);
          const ny = y + taps[t][1];
          if (nx < 0 || nx >= w || ny >= h) continue;
          const q = (ny * w + nx) * 3, wt = wts[t];
          work[q] += er * wt;
          work[q + 1] += eg * wt;
          work[q + 2] += eb * wt;
        }
      }
    }
    return out;
  }

  function thresholdColor(RGB, w, h, pal, s, frame) {
    const lin = !!s.linearLight;
    const nearest = makeNearest(pal, lin);
    const P = palWorking(pal, lin);
    // spread radius: mean nearest-neighbour distance between palette colours
    let acc = 0;
    for (let a = 0; a < P.length; a++) {
      let m = Infinity;
      for (let b = 0; b < P.length; b++) {
        if (a === b) continue;
        m = Math.min(m, Math.hypot(P[a][0] - P[b][0], P[a][1] - P[b][1], P[a][2] - P[b][2]));
      }
      acc += Number.isFinite(m) ? m : 1;
    }
    const radius = (acc / P.length) * (s.mode === "threshold" ? 1 : (s.spread ?? 100) / 100);
    const thr = thresholdFn(s, frame);
    const out = new Uint8Array(w * h);
    const tFixed = s.mode === "threshold";
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x, o = i * 3;
        const off = tFixed ? (0.5 - thr(x, y)) * radius : (thr(x, y) - 0.5) * radius;
        out[i] = nearest(RGB[o] + off, RGB[o + 1] + off, RGB[o + 2] + off);
      }
    }
    return out;
  }

  // Main entry for grid modes. Returns RGBA bytes (w*h*4) + index data for SVG export.
  E.ditherGrid = (tone, s, frame = 0) => {
    const { w, h, L, RGB, A } = tone;
    const pal = E.resolvePalette(s);
    const n = w * h;
    const rgba = new Uint8Array(n * 4);
    let idx; // palette index per pixel
    if (s.colorMode === "nearest" && RGB) {
      idx = s.mode === "diffusion" ? diffuseColor(RGB, w, h, pal, s, frame) : thresholdColor(RGB, w, h, pal, s, frame);
    } else {
      const tp = E.tonePositions(pal, s);
      const q = s.mode === "diffusion" ? diffuseTone(L, w, h, tp.pos, s, frame) : thresholdTone(L, w, h, tp.pos, s, frame);
      idx = new Uint8Array(n);
      for (let i = 0; i < n; i++) idx[i] = tp.order[q[i]];
    }
    const knock = s.transparent === "darkest" ? pal.darkest : s.transparent === "lightest" ? pal.lightest : -1;
    for (let i = 0, o = 0; i < n; i++, o += 4) {
      const c = pal.rgb[idx[i]];
      rgba[o] = c[0];
      rgba[o + 1] = c[1];
      rgba[o + 2] = c[2];
      rgba[o + 3] = idx[i] === knock ? 0 : Math.round(A[i] * 255);
    }
    return { rgba, idx, pal, w, h, knock };
  };

  /* ---------- ASCII ---------- */
  E.ASCII_SETS = {
    classic: " .:-=+*#%@",
    dense: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
    blocks: " ░▒▓█",
    binary: " 01",
    dots: " ·•●",
    slashes: " ./\\|X#"
  };

  E.asciiData = (tone, s, atlas) => {
    const { w: cols, h: rows, L, RGB, A } = tone;
    const pal = E.resolvePalette(s);
    const n = pal.rgb.length;
    const bgDark = s.asciiBg !== "light";
    // palette ordered from the background end outward
    const byLum = [...Array(n).keys()].sort((a, b) => pal.lum[a] - pal.lum[b]);
    const fromBg = bgDark ? byLum : byLum.slice().reverse();
    const bg = pal.rgb[fromBg[0]];
    const data = new Uint8Array(cols * rows * 4);
    const lines = [];
    const chars = atlas.chars;
    const nc = atlas.order.length;
    const cellIdx = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const v = L[i];
        const t = U.clamp01(bgDark ? v : 1 - v);
        const ci = atlas.order[Math.round(t * (nc - 1))];
        const colIdx = n === 2 ? 1 : 1 + Math.round(t * (n - 2));
        let c = pal.rgb[fromBg[colIdx]];
        if (s.asciiSourceColor && RGB) {
          const o = i * 3;
          const f = s.linearLight ? U.l2sFast : (z) => z;
          c = [f(RGB[o]) * 255, f(RGB[o + 1]) * 255, f(RGB[o + 2]) * 255];
        }
        const o = i * 4;
        data[o] = c[0];
        data[o + 1] = c[1];
        data[o + 2] = c[2];
        data[o + 3] = A[i] < 0.5 ? 0 : ci; // atlas slot 0 is always blank
        cellIdx[i] = A[i] < 0.5 ? 0 : ci;
        line += A[i] < 0.5 ? " " : chars[ci];
      }
      lines.push(line.replace(/\s+$/, ""));
    }
    return { data, lines, cols, rows, bg, pal, cellIdx, fromBg };
  };

  /* ---------- halftone tone texture ---------- */
  E.halftoneTexture = (tone, s) => {
    const { w, h, L, RGB, A } = tone;
    const n = w * h;
    const out = new Uint8Array(n * 4);
    const cmyk = s.htScreen === "cmyk" && RGB;
    const f = s.linearLight ? U.l2sFast : (z) => z;
    for (let i = 0, o = 0; i < n; i++, o += 4) {
      if (cmyk) {
        out[o] = Math.round(U.clamp01(f(RGB[i * 3])) * 255);
        out[o + 1] = Math.round(U.clamp01(f(RGB[i * 3 + 1])) * 255);
        out[o + 2] = Math.round(U.clamp01(f(RGB[i * 3 + 2])) * 255);
      } else {
        const v = Math.round(U.clamp01(f(L[i])) * 255);
        out[o] = out[o + 1] = out[o + 2] = v;
      }
      out[o + 3] = Math.round(A[i] * 255);
    }
    return out;
  };

  // Spot functions (u,v in [-1,1]); lower value = inked first. Must match GLSL spot().
  E.SPOTS = ["round", "euclid", "diamond", "square", "line", "ellipse"];
  E.spot = (shape, u, v) => {
    const au = Math.abs(u), av = Math.abs(v);
    switch (shape) {
      case "euclid":
        return au + av <= 1 ? (u * u + v * v) - 1 : 1 - ((au - 1) * (au - 1) + (av - 1) * (av - 1));
      case "diamond":
        return au + av;
      case "square":
        return Math.max(au, av);
      case "line":
        return av;
      case "ellipse":
        return u * u * 0.72 + v * v * 1.38;
      default:
        return u * u + v * v;
    }
  };
  // coverage (0..1, 256 steps) -> spot threshold, per shape. Makes dot area tone-accurate.
  E.buildSpotLUT = () => {
    const S = 128, N = 256;
    const out = new Float32Array(N * E.SPOTS.length);
    E.SPOTS.forEach((shape, row) => {
      const vals = new Float32Array(S * S);
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) vals[y * S + x] = E.spot(shape, ((x + 0.5) / S) * 2 - 1, ((y + 0.5) / S) * 2 - 1);
      vals.sort();
      const lo = vals[0], hi = vals[vals.length - 1];
      for (let i = 0; i < N; i++) {
        const c = i / (N - 1);
        let t;
        if (c <= 0) t = lo - 1;
        else if (c >= 1) t = hi + 1;
        else {
          const r = c * (vals.length - 1);
          const i0 = Math.floor(r);
          t = vals[i0] + (vals[Math.min(vals.length - 1, i0 + 1)] - vals[i0]) * (r - i0);
        }
        out[row * N + i] = t;
      }
    });
    return out;
  };
  E.spotLUT = E.buildSpotLUT();
  E.spotThreshold = (shape, c) => {
    const row = Math.max(0, E.SPOTS.indexOf(shape));
    const i = Math.round(U.clamp01(c) * 255);
    return E.spotLUT[row * 256 + i];
  };

  /* ---------- palette extraction (k-means++ in OKLab) ---------- */
  E.extractPalette = (img, k, seed = 11) => {
    const d = img.data;
    const n = img.width * img.height;
    const step = Math.max(1, Math.floor(n / 8000));
    const pts = [];
    for (let p = 0; p < n; p += step) {
      const i = p * 4;
      if (d[i + 3] < 128) continue;
      pts.push(U.rgbToOklab([d[i], d[i + 1], d[i + 2]]));
    }
    if (!pts.length) return ["#000000", "#ffffff"];
    k = Math.max(2, Math.min(k, pts.length));
    const rng = U.mulberry32(seed);
    const dist = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
    const C = [pts[(rng() * pts.length) | 0].slice()];
    const D = new Float64Array(pts.length);
    while (C.length < k) {
      let sum = 0;
      for (let i = 0; i < pts.length; i++) {
        let m = Infinity;
        for (const c of C) m = Math.min(m, dist(pts[i], c));
        D[i] = m;
        sum += m;
      }
      let r = rng() * sum, pick = 0;
      for (let i = 0; i < pts.length; i++) {
        r -= D[i];
        if (r <= 0) {
          pick = i;
          break;
        }
      }
      C.push(pts[pick].slice());
    }
    const assign = new Int32Array(pts.length);
    for (let it = 0; it < 14; it++) {
      for (let i = 0; i < pts.length; i++) {
        let best = 0, bd = Infinity;
        for (let c = 0; c < k; c++) {
          const dd = dist(pts[i], C[c]);
          if (dd < bd) (bd = dd), (best = c);
        }
        assign[i] = best;
      }
      const acc = Array.from({ length: k }, () => [0, 0, 0, 0]);
      for (let i = 0; i < pts.length; i++) {
        const a = acc[assign[i]];
        a[0] += pts[i][0];
        a[1] += pts[i][1];
        a[2] += pts[i][2];
        a[3]++;
      }
      for (let c = 0; c < k; c++) if (acc[c][3]) C[c] = [acc[c][0] / acc[c][3], acc[c][1] / acc[c][3], acc[c][2] / acc[c][3]];
    }
    return C.sort((a, b) => a[0] - b[0]).map((lab) => U.rgbToHex(U.oklabToRgb(lab)));
  };
})();
