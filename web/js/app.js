/* Dither Lab — application: state, schema, pipeline, sources, viewer, presets, history, export. */
(() => {
  "use strict";
  const DL = window.DL;
  const U = DL.util, E = DL.engine, ui = DL.ui, X = DL.exporters, el = ui.el;
  const $ = (id) => document.getElementById(id);

  /* =========================================================================
     Storage
     ========================================================================= */
  const LS = { settings: "ditherlab.v2.settings", prefs: "ditherlab.v2.prefs", presets: "ditherlab.v2.presets" };
  const store = {
    get(k, d) {
      try {
        const v = localStorage.getItem(k);
        return v ? JSON.parse(v) : d;
      } catch (_e) {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch (_e) {
        /* storage full or blocked — settings just won't persist */
      }
    }
  };
  const idb = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((res, rej) => {
        try {
          const r = indexedDB.open("ditherlab", 1);
          r.onupgradeneeded = () => r.result.createObjectStore("kv");
          r.onsuccess = () => res((this.db = r.result));
          r.onerror = () => rej(r.error);
        } catch (e) {
          rej(e);
        }
      });
    },
    async put(k, v) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const tx = db.transaction("kv", "readwrite");
        tx.objectStore("kv").put(v, k);
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      });
    },
    async get(k) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const r = db.transaction("kv").objectStore("kv").get(k);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    }
  };

  /* =========================================================================
     Defaults, modes, palettes, presets
     ========================================================================= */
  const DEFAULTS = {
    outWidth: 1600, transparent: "off",
    mode: "diffusion", pixelSize: 3, kernel: "floyd-steinberg", serpentine: true, diffusion: 100,
    bayerSize: 8, spread: 100, threshold: 50, seed: 1, crawl: false, crawlRate: 12, linearLight: false,
    palette: ["#161513", "#efe9da"], colorMode: "tone", levels: 0, matchLightness: false,
    exposure: 0, contrast: 0, blackPoint: 0, whitePoint: 100, curve: [[0, 0], [1, 1]], detail: 0, saturation: 100, hue: 0, invert: false,
    htScreen: "mono", htCell: 8, htShape: "round", htAngle: 45, htSoft: 0, htGain: 0, htGcr: 80, htInk: "#161514", htPaper: "#f3eee3",
    asciiSet: "classic", asciiChars: E.ASCII_SETS.classic, asciiCell: 8, asciiAspect: 1.8, asciiFont: "Menlo", asciiWeight: "normal",
    asciiBg: "dark", asciiSourceColor: false, asciiSort: true,
    bloomOn: false, bloomAmount: 45, bloomThreshold: 70, bloomKnee: 14, bloomRadius: 45, bloomTint: "#ffffff", bloomCore: 0, bloomGrain: 0,
    halOn: false, halAmount: 60, halThreshold: 78, halRadius: 30, halTint: "#ff3b1a",
    caOn: false, caMode: "radial", caAmount: 2, caAngle: 0, caFalloff: 60, caR: 1, caG: 0, caB: -1,
    loop: 4,
    shimmerOn: false, shimmerAmount: 18, shimmerScale: 3, shimmerSpeed: 1.2, shimmerNoise: "blue",
    waveOn: false, waveAmount: 10, waveFreq: 1.8, waveSpeed: 1,
    glitchOn: false, glitchAmount: 40,
    grainOn: false, grainAmount: 12, grainSize: 1.4, grainAnimate: true, vignette: 0, scanlines: 0, scanPx: 3, prism: 0
  };
  const PLATES = [
    ["C", "#00a3e0", 15],
    ["M", "#e6007e", 75],
    ["Y", "#ffed00", 0],
    ["K", "#1d1d1b", 45]
  ];
  for (const [p, ink, ang] of PLATES) Object.assign(DEFAULTS, { [`pl${p}ink`]: ink, [`pl${p}ang`]: ang, [`pl${p}op`]: 100, [`pl${p}dx`]: 0, [`pl${p}dy`]: 0 });
  // Presets never override these — they're about the file/output, not the look.
  const OUTPUT_KEYS = ["outWidth", "transparent", "loop"];

  const MODES = [
    { value: "diffusion", label: "Error diffusion", short: "Diffuse", key: "1" },
    { value: "ordered", label: "Ordered (Bayer)", short: "Bayer", key: "2" },
    { value: "bluenoise", label: "Blue noise", short: "Blue", key: "3" },
    { value: "threshold", label: "Threshold", short: "Thresh", key: "4" },
    { value: "random", label: "Random", short: "Random", key: "5" },
    { value: "halftone", label: "Halftone screen", short: "Halftone", key: "6" },
    { value: "ascii", label: "ASCII", short: "ASCII", key: "7" }
  ];
  const GRID = new Set(["diffusion", "ordered", "bluenoise", "threshold", "random"]);
  const isGrid = (s) => GRID.has(s.mode);
  const needColor = (s) => (isGrid(s) && s.colorMode === "nearest") || (s.mode === "halftone" && s.htScreen === "cmyk") || (s.mode === "ascii" && s.asciiSourceColor);

  const PALETTES = [
    ["Ink & Paper", ["#161513", "#efe9da"]],
    ["1-bit", ["#000000", "#ffffff"]],
    ["Grey 4", ["#000000", "#555555", "#aaaaaa", "#ffffff"]],
    ["DMG", ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"]],
    ["Pocket", ["#1d2b1f", "#5a7f4f", "#c7d89b"]],
    ["Electric Blue", ["#061432", "#1f7db8", "#60e0ff", "#ffffff"]],
    ["Amber / Ochre", ["#281408", "#5f340d", "#c4842d", "#fff1d1"]],
    ["Inferno", ["#060202", "#2a0b08", "#7c1410", "#d13a16", "#f98f1f", "#ffe47a"]],
    ["Phosphor", ["#111915", "#365442", "#70825c", "#c7c58c", "#f1e8cf"]],
    ["Prism", ["#08122f", "#0f3e60", "#3a7f87", "#7c8c99", "#b38d4f", "#ffffff"]],
    ["Vapor", ["#0f163a", "#42f5ce", "#ffd3f5"]],
    ["Tungsten Night", ["#0b0f14", "#1b2a3a", "#3f6f8a", "#d9b38c", "#fff4e0"]],
    ["Riso Blue / Pink", ["#1a1f4d", "#0078bf", "#ff48b0", "#f4efe6"]],
    ["Sepia", ["#1b140e", "#5a4632", "#a88c68", "#efe3cc"]],
    ["Cyanotype", ["#0b1d3a", "#1f4e8c", "#8fb3d9", "#eef3f7"]],
    ["Night Green", ["#041008", "#7bff6d"]],
    ["CGA", ["#000000", "#55ffff", "#ff55ff", "#ffffff"]],
    ["Fantasy 16", ["#000000", "#1d2b53", "#7e2553", "#008751", "#ab5236", "#5f574f", "#c2c3c7", "#fff1e8", "#ff004d", "#ffa300", "#ffec27", "#00e436", "#29adff", "#83769c", "#ff77a8", "#ffccaa"]]
  ];

  const BUILTIN = [
    { name: "Ink & Paper", s: { mode: "diffusion", pixelSize: 3, palette: ["#161513", "#efe9da"] } },
    { name: "Atkinson 1-bit", s: { mode: "diffusion", kernel: "atkinson", pixelSize: 2, palette: ["#000000", "#ffffff"], contrast: 10 } },
    { name: "Mono Dot", s: { mode: "diffusion", pixelSize: 4, palette: ["#0a100d", "#e5dcc1"], contrast: 15, bloomOn: true, bloomAmount: 18, bloomThreshold: 82, bloomRadius: 30 } },
    { name: "Newsprint", s: { mode: "diffusion", kernel: "stucki", pixelSize: 2, palette: ["#1b1b18", "#f4efe1"], contrast: 18, grainOn: true, grainAmount: 8 } },
    { name: "DMG Green", s: { mode: "ordered", bayerSize: 4, pixelSize: 5, palette: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"], contrast: 10, bloomOn: true, bloomAmount: 10 } },
    { name: "Vapor", s: { mode: "ordered", bayerSize: 8, pixelSize: 3, palette: ["#0f163a", "#42f5ce", "#ffd3f5"], levels: 5, bloomOn: true, bloomAmount: 38, bloomThreshold: 68 } },
    { name: "Pop Ordered", s: { mode: "ordered", bayerSize: 8, pixelSize: 2, palette: ["#10123f", "#ed4fb4", "#fff3cd"], levels: 6, bloomOn: true, bloomAmount: 24, bloomThreshold: 70 } },
    { name: "Boiling Blue Noise", s: { mode: "bluenoise", pixelSize: 2, palette: ["#2b2a1f", "#e8e4cf"], crawl: true, crawlRate: 10, contrast: 12 } },
    {
      name: "Neon Glow",
      s: {
        mode: "diffusion", kernel: "jarvis", palette: ["#061432", "#1f7db8", "#60e0ff", "#ffffff"], levels: 5, contrast: 25, exposure: 0.2,
        bloomOn: true, bloomAmount: 76, bloomThreshold: 62, bloomRadius: 60, bloomTint: "#66d6ff", bloomCore: 26, bloomGrain: 12,
        caOn: true, caMode: "radial", caAmount: 2.4, caFalloff: 72, caR: 1.3, caG: 0, caB: -1.3
      }
    },
    {
      name: "Prism Bloom",
      s: {
        mode: "bluenoise", pixelSize: 2, palette: ["#08122f", "#0f3e60", "#3a7f87", "#7c8c99", "#b38d4f", "#ffffff"], contrast: 20, exposure: 0.26, blackPoint: 2,
        bloomOn: true, bloomAmount: 82, bloomThreshold: 58, bloomRadius: 65, bloomTint: "#7fd6ff", bloomCore: 34,
        caOn: true, caMode: "radial", caAmount: 2.8, caFalloff: 74, caR: 1.35, caG: 0.08, caB: -1.28
      }
    },
    {
      name: "Inferno Bayer",
      s: {
        mode: "ordered", bayerSize: 4, pixelSize: 4, palette: ["#060202", "#2a0b08", "#7c1410", "#d13a16", "#f98f1f", "#ffe47a"], contrast: 28, exposure: 0.2, blackPoint: 4,
        bloomOn: true, bloomAmount: 88, bloomThreshold: 54, bloomRadius: 60, bloomTint: "#ff9a2e", bloomCore: 42,
        caOn: true, caMode: "linear", caAngle: 6, caAmount: 1.7, caFalloff: 66, caR: 0.82, caG: 0.02, caB: -0.62
      }
    },
    {
      name: "Vintage Phosphor",
      s: {
        mode: "diffusion", kernel: "stucki", pixelSize: 2, palette: ["#111915", "#365442", "#70825c", "#c7c58c", "#f1e8cf"], exposure: 0.1,
        bloomOn: true, bloomAmount: 46, bloomThreshold: 68, bloomRadius: 45, bloomTint: "#ffc78d", bloomCore: 16,
        caOn: true, caAmount: 0.8, caFalloff: 40, caR: 0.34, caG: 0.02, caB: -0.22, scanlines: 30, scanPx: 3
      }
    },
    {
      name: "Prismatic Glitch",
      s: {
        mode: "bluenoise", pixelSize: 2, palette: ["#070a1c", "#22295f", "#7b4ee7", "#f447ac", "#ffffff"], levels: 6, contrast: 30, exposure: 0.28, blackPoint: 2,
        bloomOn: true, bloomAmount: 92, bloomThreshold: 48, bloomRadius: 65, bloomTint: "#ffa6f0", bloomCore: 44,
        caOn: true, caMode: "linear", caAngle: -12, caAmount: 3.2, caFalloff: 74, caR: 1.55, caG: 0.12, caB: -1.46,
        prism: 58, glitchOn: true, glitchAmount: 30
      }
    },
    {
      name: "800T Halation",
      s: {
        mode: "bluenoise", pixelSize: 2, palette: ["#0b0f14", "#1b2a3a", "#3f6f8a", "#d9b38c", "#fff4e0"], matchLightness: true,
        bloomOn: true, bloomAmount: 28, bloomThreshold: 72, bloomRadius: 55, bloomTint: "#ffe9d6",
        halOn: true, halAmount: 90, halThreshold: 72, halRadius: 26, halTint: "#ff3b1a", grainOn: true, grainAmount: 14, grainSize: 1.4
      }
    },
    {
      name: "Hacker",
      s: {
        mode: "ascii", palette: ["#041008", "#7bff6d"], asciiSet: "dense", asciiChars: E.ASCII_SETS.dense, asciiCell: 6, contrast: 20,
        shimmerOn: true, shimmerAmount: 22, shimmerSpeed: 1.8, waveOn: true, waveAmount: 11
      }
    },
    {
      name: "Shimmer",
      s: {
        mode: "ascii", palette: ["#090c14", "#f4ecc6"], contrast: 18, shimmerOn: true, shimmerAmount: 26, shimmerSpeed: 1.6,
        waveOn: true, waveFreq: 1.4, waveAmount: 14, waveSpeed: 1.1, bloomOn: true, bloomAmount: 36, bloomThreshold: 70
      }
    },
    { name: "Newsprint Halftone", s: { mode: "halftone", htScreen: "mono", htCell: 6, htAngle: 45, htShape: "round", htInk: "#1c1b19", htPaper: "#e9e3d3", htGain: 12, grainOn: true, grainAmount: 8 } },
    { name: "Line Screen", s: { mode: "halftone", htScreen: "mono", htCell: 7, htAngle: 30, htShape: "line", htInk: "#152238", htPaper: "#f1ede4" } },
    { name: "Process CMYK", s: { mode: "halftone", htScreen: "cmyk", htCell: 7, htShape: "round", htPaper: "#f7f3ea", htGcr: 80, htGain: 8 } },
    {
      name: "Riso Misregister",
      s: {
        mode: "halftone", htScreen: "cmyk", htCell: 6, htShape: "round", htSoft: 12, htGcr: 0, htPaper: "#f4efe6", saturation: 120,
        plCink: "#0078bf", plCop: 92, plCdx: 1.5, plCdy: -1, plMink: "#ff48b0", plMop: 92, plMdx: -2, plMdy: 1.5, plYop: 0, plKop: 0,
        grainOn: true, grainAmount: 10
      }
    },
    { name: "Fantasy 16", s: { mode: "diffusion", colorMode: "nearest", pixelSize: 3, palette: PALETTES.find((p) => p[0] === "Fantasy 16")[1] } }
  ];

  /* =========================================================================
     State
     ========================================================================= */
  const sanitize = (raw) => {
    const s = U.deepClone(DEFAULTS);
    if (!raw || typeof raw !== "object") return s;
    for (const k of Object.keys(DEFAULTS)) {
      if (!(k in raw)) continue;
      const v = raw[k], d = DEFAULTS[k];
      if (Array.isArray(d)) {
        if (k === "palette" && Array.isArray(v) && v.filter(U.isHex).length >= 2) s.palette = v.filter(U.isHex).map(U.normalizeHex);
        if (k === "curve" && Array.isArray(v) && v.length >= 2 && v.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))) s.curve = v;
      } else if (typeof v === typeof d) s[k] = v;
    }
    return s;
  };
  const prefs = Object.assign({ collapsed: { halation: true, chroma: true, finish: true }, viewBg: "dark", exScale: 1, exFormat: "png", exFps: 24, exQuality: "high", panels: true }, store.get(LS.prefs, {}));
  const savePrefs = U.debounce(() => store.set(LS.prefs, prefs), 200);

  const state = {
    s: sanitize(store.get(LS.settings, null)),
    preview: null,
    hist: [],
    hi: -1,
    time: 0,
    playing: true,
    presetName: null
  };
  const saveSettings = U.debounce(() => store.set(LS.settings, state.s), 250);
  const eff = () => state.preview || state.s;

  /* =========================================================================
     Renderer + pipeline
     ========================================================================= */
  const viewCanvas = $("view");
  viewCanvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    ui.toast("GPU context lost — reloading (settings and image are kept)…", "error");
    setTimeout(() => location.reload(), 900);
  });
  let R = null;
  try {
    R = new DL.Renderer(viewCanvas);
  } catch (err) {
    $("viewport").append(el("div", { class: "fatal" }, el("strong", {}, "WebGL2 unavailable"), el("p", {}, String(err.message || err))));
    console.error(err);
  }

  const SAMPLE_KEYS = ["outWidth", "pixelSize", "mode", "asciiCell", "asciiAspect"];
  const TONE_KEYS = ["exposure", "contrast", "blackPoint", "whitePoint", "curve", "detail", "invert", "linearLight", "saturation", "hue", "colorMode", "htScreen", "asciiSourceColor"];
  const DITHER_KEYS = ["kernel", "serpentine", "diffusion", "bayerSize", "spread", "threshold", "seed", "crawl", "crawlRate", "palette", "levels", "matchLightness", "transparent", "asciiChars", "asciiFont", "asciiWeight", "asciiBg", "asciiSort"];
  const pick = (s, keys) => JSON.stringify(keys.map((k) => s[k]));

  const pipe = { sKey: "", tKey: "", dKey: "", aKey: "", oKey: "", img: null, tone: null, res: null, asc: null, toneTex: null, atlas: null, layout: null, cpuMs: 0, glMs: 0 };
  const sampleCanvas = document.createElement("canvas");
  const sctx = sampleCanvas.getContext("2d", { willReadFrequently: true });
  const origCanvas = document.createElement("canvas");
  const octx = origCanvas.getContext("2d");
  let src = null;
  let target = null;
  const dirty = { gl: true, view: true };
  const markDirty = () => {
    dirty.gl = true;
    dirty.view = true;
  };

  function layoutFor(s, source) {
    const aspect = source.height / source.width;
    const W0 = U.clamp(Math.round(s.outWidth), 64, 8192);
    const H0 = Math.max(1, Math.round(W0 * aspect));
    if (s.mode === "halftone") {
      const k = Math.min(0.5, 1200 / W0);
      return { kind: "halftone", outW: W0, outH: H0, sw: Math.max(2, Math.round(W0 * k)), sh: Math.max(2, Math.round(H0 * k)) };
    }
    if (s.mode === "ascii") {
      const cw = s.asciiCell, ch = Math.max(2, Math.round(cw * s.asciiAspect));
      const cols = Math.max(1, Math.floor(W0 / cw)), rows = Math.max(1, Math.floor(H0 / ch));
      return { kind: "ascii", outW: cols * cw, outH: rows * ch, sw: cols, sh: rows, cellW: cw, cellH: ch };
    }
    const px = s.pixelSize;
    const gw = Math.max(1, Math.floor(W0 / px)), gh = Math.max(1, Math.floor(H0 / px));
    return { kind: "grid", outW: gw * px, outH: gh * px, sw: gw, sh: gh };
  }

  function sampleSource(source, w, h, t) {
    if (sampleCanvas.width !== w || sampleCanvas.height !== h) {
      sampleCanvas.width = w;
      sampleCanvas.height = h;
    }
    sctx.clearRect(0, 0, w, h);
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = "high";
    sctx.drawImage(source.drawable(t), 0, 0, w, h);
    return sctx.getImageData(0, 0, w, h);
  }

  function ensureAtlas(s, L, supersample) {
    const key = JSON.stringify([s.asciiChars, L.cellW, L.cellH, s.asciiFont, s.asciiWeight, s.asciiSort, supersample]);
    if (key === pipe.aKey && pipe.atlas) return false;
    pipe.atlas = DL.buildAtlas(s.asciiChars || " .:#", L.cellW, L.cellH, s.asciiFont, s.asciiWeight, supersample, s.asciiSort);
    R.setAtlas(pipe.atlas);
    pipe.aKey = key;
    return true;
  }

  // Runs whatever CPU stages are stale. Returns true if GPU inputs changed.
  function runCPU(s, t, opts = {}) {
    if (!src || !R) return false;
    const t0 = performance.now();
    const L = layoutFor(s, src);
    const sizeChanged = !pipe.layout || pipe.layout.outW !== L.outW || pipe.layout.outH !== L.outH;
    pipe.layout = L;
    let changed = false;
    const sKey = [src.id, src.frameKey(t), L.sw, L.sh, L.kind].join("|");
    if (sKey !== pipe.sKey || opts.force) {
      pipe.img = sampleSource(src, L.sw, L.sh, t);
      pipe.sKey = sKey;
      pipe.tKey = "";
    }
    const nc = needColor(s);
    const tKey = sKey + pick(s, TONE_KEYS) + nc;
    if (tKey !== pipe.tKey) {
      pipe.tone = E.tone(pipe.img, s, nc);
      pipe.hasAlpha = pipe.tone.A.some((a) => a < 0.99);
      pipe.tKey = tKey;
      pipe.dKey = "";
      curveEditor && curveEditor.setHistogram(pipe.tone.hist);
    }
    const frame = s.crawl && L.kind === "grid" ? Math.floor(t * s.crawlRate) : 0;
    let atlasChanged = false;
    if (L.kind === "ascii") atlasChanged = ensureAtlas(s, L, opts.supersample || 2);
    const dKey = tKey + pick(s, DITHER_KEYS) + frame + (L.kind === "ascii" ? pipe.aKey : "");
    if (dKey !== pipe.dKey || atlasChanged) {
      if (L.kind === "grid") {
        pipe.res = E.ditherGrid(pipe.tone, s, frame);
        R.setGrid(pipe.res.rgba, pipe.res.w, pipe.res.h);
      } else if (L.kind === "ascii") {
        pipe.asc = E.asciiData(pipe.tone, s, pipe.atlas);
        R.setAscii(pipe.asc.data, pipe.asc.cols, pipe.asc.rows);
      } else {
        pipe.toneTex = E.halftoneTexture(pipe.tone, s);
        R.setTone(pipe.toneTex, pipe.tone.w, pipe.tone.h);
      }
      pipe.dKey = dKey;
      changed = true;
    }
    if (changed) pipe.cpuMs = performance.now() - t0;
    if (sizeChanged) onLayoutSize();
    return changed || sizeChanged;
  }

  const rgb01 = (hex) => U.hexToRgb(hex).map((v) => v / 255);
  const rad = (d) => (d * Math.PI) / 180;
  function buildParams(s, t) {
    const L = pipe.layout;
    const loop = Math.max(0.5, s.loop);
    const phase = (((t % loop) + loop) % loop) / loop;
    const cmyk = s.htScreen === "cmyk";
    const knock = s.transparent !== "off";
    const P = {
      outW: L.outW, outH: L.outH, phase,
      mode: L.kind === "ascii" ? 1 : L.kind === "halftone" ? 2 : 0,
      pixel: s.pixelSize,
      cell: [L.cellW || 1, L.cellH || 1],
      asciiBg: pipe.asc ? [...pipe.asc.bg.map((v) => v / 255), knock ? 0 : 1] : [0, 0, 0, 1],
      shape: Math.max(0, E.SPOTS.indexOf(s.htShape)), cellPx: s.htCell, cmyk: cmyk ? 1 : 0,
      angles: cmyk ? PLATES.map(([p]) => rad(s[`pl${p}ang`])) : [rad(s.htAngle), 0, 0, 0],
      opac: cmyk ? PLATES.map(([p]) => s[`pl${p}op`] / 100) : [1, 0, 0, 0],
      offX: cmyk ? PLATES.map(([p]) => s[`pl${p}dx`]) : [0, 0, 0, 0],
      offY: cmyk ? PLATES.map(([p]) => s[`pl${p}dy`]) : [0, 0, 0, 0],
      inks: cmyk ? PLATES.map(([p]) => rgb01(s[`pl${p}ink`])) : [[0, 0, 0], [0, 0, 0], [0, 0, 0], rgb01(s.htInk)],
      paper: [...rgb01(s.htPaper), knock ? 0 : 1],
      soft: (s.htSoft / 100) * 0.6, gain: s.htGain / 100, gcr: s.htGcr / 100,
      waveAmp: s.waveOn ? (s.waveAmount / 100) * 22 : 0, waveFreq: s.waveFreq,
      waveM: [Math.max(1, Math.round((loop * s.waveSpeed * 2.4) / (Math.PI * 2))), Math.max(1, Math.round((loop * s.waveSpeed * 1.7) / (Math.PI * 2)))],
      caOn: s.caOn ? 1 : 0, caRadial: s.caMode === "radial" ? 1 : 0, caAmt: s.caAmount, caDir: [Math.cos(rad(s.caAngle)), Math.sin(rad(s.caAngle))],
      caFall: s.caFalloff / 100, caMag: [s.caR, s.caG, s.caB],
      shimAmt: s.shimmerOn ? s.shimmerAmount / 100 : 0, shimScale: Math.max(1, s.shimmerScale),
      shimP: Math.max(1, Math.round(loop * s.shimmerSpeed * (s.shimmerNoise === "blue" ? 8 : 1))), shimBlue: s.shimmerNoise === "blue" ? 1 : 0,
      bloomOn: s.bloomOn && s.bloomAmount > 0, bloomAmt: s.bloomAmount / 100, bloomTh: s.bloomThreshold / 100, bloomKnee: Math.max(0.005, s.bloomKnee / 100),
      bloomTint: rgb01(s.bloomTint), bloomLevels: 1 + Math.round((s.bloomRadius / 100) * 7), bloomSpread: 1 + (s.bloomRadius / 100) * 0.6,
      haloAmt: s.bloomCore / 100, bloomGrain: s.bloomGrain / 100,
      halOn: s.halOn && s.halAmount > 0, halAmt: s.halAmount / 100, halTh: s.halThreshold / 100, halKnee: 0.06, halTint: rgb01(s.halTint),
      halLevels: 1 + Math.round((s.halRadius / 100) * 5),
      grainAmt: s.grainOn ? (s.grainAmount / 100) * 0.4 : 0, grainSize: Math.max(0.5, s.grainSize), grainSeed: s.grainAnimate ? Math.floor(t * 24) % 997 : 7,
      vignette: s.vignette / 100, glitch: s.glitchOn ? s.glitchAmount / 100 : 0, glitchStep: Math.max(1, Math.round(loop * 8)),
      scan: s.scanlines / 100, scanPx: s.scanPx, prism: s.prism / 100
    };
    return P;
  }
  const hasAnimFx = (s) =>
    (s.shimmerOn && s.shimmerAmount > 0) || (s.waveOn && s.waveAmount > 0) || (s.glitchOn && s.glitchAmount > 0) ||
    (s.crawl && isGrid(s)) || (s.grainOn && s.grainAnimate && s.grainAmount > 0);

  function ensureOriginal(t) {
    const L = pipe.layout;
    if (!L || !src) return;
    const key = [src.id, src.frameKey(t), L.outW, L.outH].join("|");
    if (key === pipe.oKey) return;
    if (origCanvas.width !== L.outW || origCanvas.height !== L.outH) {
      origCanvas.width = L.outW;
      origCanvas.height = L.outH;
    }
    octx.clearRect(0, 0, L.outW, L.outH);
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = "high";
    octx.drawImage(src.drawable(t), 0, 0, L.outW, L.outH);
    R.setOriginal(origCanvas);
    pipe.oKey = key;
  }

  /* =========================================================================
     Viewer
     ========================================================================= */
  const viewport = $("viewport");
  const view = { mode: "fit", zoom: 1, panX: 0, panY: 0, split: 0.5, splitOn: false, holdOrig: false };
  const VIEW_BG = { dark: [0.106, 0.106, 0.11], mid: [0.33, 0.33, 0.33], light: [0.86, 0.86, 0.85], black: [0, 0, 0] };
  let dpr = window.devicePixelRatio || 1;

  function imgDims() {
    return pipe.layout ? [pipe.layout.outW, pipe.layout.outH] : [0, 0];
  }
  function fitZoom() {
    const [w, h] = imgDims();
    if (!w) return 1;
    const r = viewport.getBoundingClientRect();
    const z = Math.min((r.width - 48) / w, (r.height - 48) / h);
    return z >= 1 ? Math.min(16, Math.floor(z)) : Math.max(0.02, z);
  }
  function centerImage() {
    const [w, h] = imgDims();
    const r = viewport.getBoundingClientRect();
    view.panX = (r.width - w * view.zoom) / 2;
    view.panY = (r.height - h * view.zoom) / 2;
  }
  function setFit() {
    view.mode = "fit";
    view.zoom = fitZoom();
    centerImage();
    dirty.view = true;
  }
  function setZoom(z, cx, cy) {
    const r = viewport.getBoundingClientRect();
    if (cx == null) {
      cx = r.width / 2;
      cy = r.height / 2;
    }
    const nz = U.clamp(z, 0.02, 64);
    const ix = (cx - view.panX) / view.zoom, iy = (cy - view.panY) / view.zoom;
    view.zoom = nz;
    view.panX = cx - ix * nz;
    view.panY = cy - iy * nz;
    view.mode = "manual";
    dirty.view = true;
  }
  function onLayoutSize() {
    if (view.mode === "fit") setFit();
    else dirty.view = true;
  }
  function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    const r = viewport.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (viewCanvas.width !== w || viewCanvas.height !== h) {
      viewCanvas.width = w;
      viewCanvas.height = h;
    }
    if (view.mode === "fit") setFit();
    dirty.view = true;
  }
  new ResizeObserver(resizeCanvas).observe(viewport);

  function viewParams() {
    const s = eff();
    const split = view.holdOrig ? 2 : view.splitOn ? view.split : 0;
    return {
      pan: [view.panX * dpr, view.panY * dpr],
      zoom: view.zoom * dpr,
      split,
      viewBg: VIEW_BG[prefs.viewBg] || VIEW_BG.dark,
      bg: VIEW_BG[prefs.viewBg] || VIEW_BG.dark,
      checker: s.transparent !== "off" || !!pipe.hasAlpha,
      dpr
    };
  }

  const splitLine = $("splitLine");
  const hud = $("hud");
  function updateOverlay() {
    const [w, h] = imgDims();
    const on = view.splitOn && !view.holdOrig && w > 0;
    splitLine.style.display = on ? "block" : "none";
    if (on) {
      const x = view.panX + view.split * w * view.zoom;
      splitLine.style.transform = `translateX(${Math.round(x)}px)`;
      splitLine.style.top = `${Math.max(0, view.panY)}px`;
      splitLine.style.height = `${Math.min(viewport.clientHeight, view.panY + h * view.zoom) - Math.max(0, view.panY)}px`;
    }
    $("zoomRead").textContent = w ? `${Math.round(view.zoom * 100)}%` : "—";
    $("splitBtn").classList.toggle("on", view.splitOn);
    $("origBtn").classList.toggle("on", view.holdOrig);
    $("fitBtn").classList.toggle("on", view.mode === "fit");
    $("oneBtn").classList.toggle("on", Math.abs(view.zoom - 1) < 1e-6);
    const L = pipe.layout;
    if (L) {
      const detail = L.kind === "grid" ? `grid ${L.sw}×${L.sh}` : L.kind === "ascii" ? `${L.sw}×${L.sh} chars` : `${eff().htCell}px cells`;
      hud.textContent = `${L.outW}×${L.outH} · ${detail} · ${pipe.cpuMs.toFixed(0)}+${pipe.glMs.toFixed(1)} ms${view.holdOrig ? " · ORIGINAL" : ""}`;
    }
  }

  // pan / zoom / split interactions
  let spaceDown = false, spaceUsed = false;
  (() => {
    let drag = null;
    viewport.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".split-line")) return;
      if (e.button !== 0 && e.button !== 1) return;
      viewport.focus({ preventScroll: true });
      drag = { x: e.clientX, y: e.clientY, px: view.panX, py: view.panY, moved: false };
      viewport.setPointerCapture(e.pointerId);
      viewport.classList.add("panning");
      if (spaceDown) spaceUsed = true;
    });
    viewport.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
      view.panX = drag.px + dx;
      view.panY = drag.py + dy;
      if (drag.moved) view.mode = "manual";
      dirty.view = true;
    });
    const end = () => {
      drag = null;
      viewport.classList.remove("panning");
    };
    viewport.addEventListener("pointerup", end);
    viewport.addEventListener("pointercancel", end);
    viewport.addEventListener("dblclick", (e) => {
      if (e.target.closest(".split-line")) return;
      const r = viewport.getBoundingClientRect();
      if (view.mode === "fit") setZoom(1, e.clientX - r.left, e.clientY - r.top);
      else setFit();
    });
    viewport.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const r = viewport.getBoundingClientRect();
        if (e.ctrlKey || e.metaKey) {
          const k = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0025));
          setZoom(view.zoom * k, e.clientX - r.left, e.clientY - r.top);
        } else {
          view.panX -= e.deltaX;
          view.panY -= e.deltaY;
          view.mode = "manual";
          dirty.view = true;
        }
      },
      { passive: false }
    );
    let sd = null;
    splitLine.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      splitLine.setPointerCapture(e.pointerId);
      sd = true;
    });
    splitLine.addEventListener("pointermove", (e) => {
      if (!sd) return;
      const r = viewport.getBoundingClientRect();
      const [w] = imgDims();
      view.split = U.clamp((e.clientX - r.left - view.panX) / (w * view.zoom), 0, 1);
      dirty.view = true;
    });
    splitLine.addEventListener("pointerup", () => (sd = null));
  })();

  /* =========================================================================
     Sources
     ========================================================================= */
  let srcSeq = 0;
  let videoEl = null;
  function disposeSource() {
    if (!src) return;
    if (src.kind === "video" && src.video) {
      src.video.pause();
      src.video.removeAttribute("src");
      src.video.load();
      src.video.remove();
      if (src.url) URL.revokeObjectURL(src.url);
    }
    if (src.kind === "gif") src.frames.forEach((f) => f.bmp.close && f.bmp.close());
    if (src.bitmap && src.bitmap.close) src.bitmap.close();
    if (src.url && src.kind !== "video") URL.revokeObjectURL(src.url);
    src = null;
    videoEl = null;
  }
  function setSource(next) {
    disposeSource();
    src = next;
    pipe.sKey = pipe.tKey = pipe.dKey = pipe.oKey = "";
    state.time = 0;
    state.playing = true;
    view.mode = "fit";
    const meta = [next.name, `${next.width}×${next.height}`];
    if (next.animated && Number.isFinite(next.duration)) meta.push(`${next.duration.toFixed(2)}s`);
    if (next.kind === "gif") meta.push(`${next.frames.length} frames`);
    $("fileMeta").textContent = meta.join(" · ");
    $("fileMeta").title = meta.join(" · ");
    document.title = `${next.name} — Dither Lab`;
    markDirty();
    updateTransport(true);
  }
  const imageSource = (bmp, name, extra = {}) => ({
    id: ++srcSeq, kind: "image", name, width: bmp.width, height: bmp.height, animated: false, duration: 0,
    bitmap: bmp, drawable: () => bmp, frameKey: () => 0, ...extra
  });

  async function loadFile(file, { remember = true, restored = false } = {}) {
    if (!file) return;
    const name = file.name || "pasted-image";
    const type = (file.type || "").toLowerCase();
    const lower = name.toLowerCase();
    try {
      setBusy(`Opening ${name}…`);
      if (type.startsWith("video/") || /\.(mp4|webm|mov|m4v|ogv)$/.test(lower)) await loadVideo(file, name);
      else if (type === "image/gif" || lower.endsWith(".gif")) await loadGif(file, name);
      else if (type === "image/svg+xml" || lower.endsWith(".svg")) await loadSvg(file, name);
      else {
        const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
        setSource(imageSource(bmp, name));
      }
      if (remember && file.size < 250 * 1024 * 1024) idb.put("last", { blob: file, name, type: file.type }).catch(() => {});
      ui.toast(restored ? `Restored ${name} from last session` : `Opened ${name}`);
    } catch (err) {
      console.error(err);
      ui.toast(`Couldn't open ${name}: ${err.message || err}`, "error");
    } finally {
      setBusy(null);
    }
  }

  async function loadVideo(file, name) {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = "auto";
    v.className = "hidden-media";
    document.body.append(v);
    v.src = url;
    await new Promise((res, rej) => {
      v.addEventListener("loadeddata", res, { once: true });
      v.addEventListener("error", () => rej(new Error("this browser can't decode the video")), { once: true });
    });
    const s = {
      id: ++srcSeq, kind: "video", name, url, video: v, width: v.videoWidth, height: v.videoHeight, animated: true,
      duration: Number.isFinite(v.duration) ? v.duration : 0, frames: 0,
      drawable: () => v,
      // decoded-frame count advances even if the (hidden) element is never composited,
      // so playback can't stall; `frames` bumps on seeks and presented frames.
      frameKey: () =>
        `${s.frames}:${v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality().totalVideoFrames : Math.round(v.currentTime * 1000)}`
    };
    if (v.requestVideoFrameCallback) {
      const cb = () => {
        s.frames++;
        if (src === s) v.requestVideoFrameCallback(cb);
      };
      v.requestVideoFrameCallback(cb);
    }
    v.addEventListener("seeked", () => s.frames++);
    videoEl = v;
    setSource(s);
    try {
      await v.play();
    } catch (_e) {
      state.playing = false;
    }
  }

  async function loadGif(file, name) {
    const canDecode = typeof ImageDecoder !== "undefined" && (await ImageDecoder.isTypeSupported("image/gif").catch(() => false));
    if (!canDecode) {
      const bmp = await createImageBitmap(file);
      setSource(imageSource(bmp, name));
      ui.toast("Animated GIF decoding isn't supported here — using the first frame.");
      return;
    }
    const dec = new ImageDecoder({ data: await file.arrayBuffer(), type: "image/gif" });
    await dec.tracks.ready;
    await dec.completed.catch(() => {});
    const track = dec.tracks.selectedTrack;
    const total0 = track ? track.frameCount : 1;
    const first = (await dec.decode({ frameIndex: 0 })).image;
    const bytesPerFrame = Math.max(1, first.displayWidth * first.displayHeight * 4);
    first.close();
    const budget = Math.max(8, Math.floor(600e6 / bytesPerFrame));
    const count = Math.max(1, Math.min(total0, 1200, budget));
    if (count < total0) ui.toast(`Long GIF: using the first ${count} of ${total0} frames to stay within memory`);
    const frames = [];
    let acc = 0;
    const timeline = [];
    for (let i = 0; i < count; i++) {
      const { image } = await dec.decode({ frameIndex: i });
      const bmp = await createImageBitmap(image);
      let d = image.duration ? image.duration / 1000 : 100;
      if (d <= 10) d = 100;
      image.close();
      frames.push({ bmp, dur: d });
      acc += d;
      timeline.push(acc);
      if (i % 20 === 0) setBusy(`Decoding GIF ${i + 1}/${count}…`);
    }
    dec.close();
    if (frames.length === 1) {
      setSource(imageSource(frames[0].bmp, name));
      return;
    }
    const total = acc;
    const idxAt = (t) => {
      const ms = (((t * 1000) % total) + total) % total;
      let lo = 0, hi = timeline.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (ms < timeline[mid]) hi = mid;
        else lo = mid + 1;
      }
      return lo;
    };
    setSource({
      id: ++srcSeq, kind: "gif", name, frames, timeline, width: frames[0].bmp.width, height: frames[0].bmp.height, animated: true,
      duration: total / 1000, drawable: (t) => frames[idxAt(t)].bmp, frameKey: (t) => idxAt(t), frameAt: idxAt
    });
  }

  async function loadSvg(file, name) {
    const text = await file.text();
    const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
    const img = new Image();
    img.src = url;
    await img.decode();
    let w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) {
      const vb = text.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
      w = vb ? +vb[1] : 1000;
      h = vb ? +vb[2] : 1000;
    }
    const scale = 2000 / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
    const animated = /<\s*animate(Transform|Motion)?\b|<\s*set\b|@keyframes|animation\s*:/i.test(text);
    setSource({
      id: ++srcSeq, kind: animated ? "svg-anim" : "image", name, url, img, width: w, height: h, animated,
      duration: animated ? eff().loop : 0, drawable: () => img,
      frameKey: animated ? (t) => Math.floor(t * 30) : () => 0
    });
  }

  function makeDemo() {
    const W = 1600, H = 1000;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");
    const rng = U.mulberry32(42);
    const sky = g.createLinearGradient(0, 0, 0, H * 0.66);
    sky.addColorStop(0, "#05071a");
    sky.addColorStop(0.5, "#16204a");
    sky.addColorStop(0.82, "#46486f");
    sky.addColorStop(1, "#b98468");
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) {
      const y = rng() * H * 0.55;
      g.fillStyle = `rgba(255,250,235,${0.25 + rng() * 0.6 * (1 - y / (H * 0.55))})`;
      const r = rng() < 0.08 ? 1.8 : 0.9;
      g.beginPath();
      g.arc(rng() * W, y, r, 0, Math.PI * 2);
      g.fill();
    }
    const mx = 1150, my = 250;
    const halo = g.createRadialGradient(mx, my, 40, mx, my, 420);
    halo.addColorStop(0, "rgba(255,240,215,0.42)");
    halo.addColorStop(0.35, "rgba(200,190,230,0.12)");
    halo.addColorStop(1, "rgba(120,120,200,0)");
    g.fillStyle = halo;
    g.fillRect(0, 0, W, H);
    const moon = g.createRadialGradient(mx - 18, my - 18, 6, mx, my, 74);
    moon.addColorStop(0, "#ffffff");
    moon.addColorStop(0.7, "#fbf5e2");
    moon.addColorStop(1, "#e9dfc4");
    g.fillStyle = moon;
    g.beginPath();
    g.arc(mx, my, 72, 0, Math.PI * 2);
    g.fill();
    const ridge = (base, amp, col, seed) => {
      const r2 = U.mulberry32(seed);
      const ph = [r2() * 6, r2() * 6, r2() * 6];
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) {
        const y = base - amp * (0.55 * Math.sin(x / 260 + ph[0]) + 0.3 * Math.sin(x / 97 + ph[1]) + 0.15 * Math.sin(x / 41 + ph[2]));
        g.lineTo(x, y);
      }
      g.lineTo(W, H);
      g.closePath();
      g.fill();
    };
    ridge(620, 70, "#3a3d63", 3);
    ridge(660, 60, "#262846", 5);
    ridge(700, 46, "#15172d", 9);
    const water = g.createLinearGradient(0, 700, 0, H);
    water.addColorStop(0, "#1a1c36");
    water.addColorStop(1, "#07080f");
    g.fillStyle = water;
    g.fillRect(0, 720, W, H - 720);
    for (let i = 0; i < 70; i++) {
      const y = 730 + i * 3.8 + rng() * 2;
      const wdt = (24 + rng() * 60) * (1 - i / 90);
      g.fillStyle = `rgba(255,244,220,${0.55 * (1 - i / 75)})`;
      g.fillRect(mx - wdt / 2 + (rng() - 0.5) * 24, y, wdt, 1.6);
    }
    // cabin + windows + lamp (warm highlights for halation)
    g.fillStyle = "#0b0c18";
    g.beginPath();
    g.moveTo(300, 700);
    g.lineTo(300, 640);
    g.lineTo(370, 600);
    g.lineTo(440, 640);
    g.lineTo(440, 700);
    g.closePath();
    g.fill();
    g.fillStyle = "#ffcf7a";
    g.fillRect(322, 652, 22, 20);
    g.fillRect(396, 652, 22, 20);
    g.fillStyle = "#0b0c18";
    g.fillRect(530, 560, 5, 150);
    const lamp = g.createRadialGradient(532, 556, 2, 532, 556, 90);
    lamp.addColorStop(0, "rgba(255,236,190,1)");
    lamp.addColorStop(0.12, "rgba(255,200,120,0.85)");
    lamp.addColorStop(1, "rgba(255,160,80,0)");
    g.fillStyle = lamp;
    g.beginPath();
    g.arc(532, 556, 90, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 22; i++) {
      g.fillStyle = `rgba(255,200,130,${0.4 * (1 - i / 22)})`;
      g.fillRect(522 + (rng() - 0.5) * 10, 735 + i * 4.5, 20 - i * 0.6, 1.4);
    }
    g.fillStyle = "rgba(239,233,218,0.55)";
    g.font = "500 22px Menlo, monospace";
    g.fillText("D I T H E R   L A B", W - 330, H - 36);
    return createImageBitmap(c).then((bmp) => imageSource(bmp, "Nocturne (demo)"));
  }

  const ICONS = {
    play: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4.5 2.8v10.4L13 8z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="4" y="3" width="2.6" height="10" rx="0.6" fill="currentColor"/><rect x="9.4" y="3" width="2.6" height="10" rx="0.6" fill="currentColor"/></svg>'
  };

  /* =========================================================================
     Transport / time
     ========================================================================= */
  const timelineDur = () => (src && src.animated && src.kind !== "svg-anim" ? src.duration : Math.max(0.5, eff().loop));
  function setPlaying(p) {
    state.playing = p;
    if (src && src.kind === "video") p ? src.video.play().catch(() => {}) : src.video.pause();
    updateTransport(true);
  }
  function seek(t) {
    const D = timelineDur();
    t = U.clamp(t, 0, Math.max(0, D - 1e-4));
    state.time = t;
    if (src && src.kind === "video") src.video.currentTime = t;
    markDirty();
    updateTransport(true);
  }
  function stepFrame(dir) {
    setPlaying(false);
    if (src && src.kind === "gif") {
      const i = src.frameAt(state.time);
      const j = (i + dir + src.frames.length) % src.frames.length;
      seek(j === 0 ? 0 : src.timeline[j - 1] / 1000 + 0.0005);
    } else seek(state.time + dir / 30);
  }
  let lastTransportPaint = 0;
  function updateTransport(force) {
    const now = performance.now();
    if (!force && now - lastTransportPaint < 60) return;
    lastTransportPaint = now;
    // based on committed settings, so hover-previewing a preset never shifts the layout
    const show = !!src && (src.animated || hasAnimFx(state.s));
    document.body.classList.toggle("has-transport", show);
    if (!show) return;
    const D = timelineDur();
    const t = src.kind === "video" ? src.video.currentTime : state.time;
    $("timeNow").textContent = U.fmtTime(t);
    $("timeDur").textContent = U.fmtTime(D);
    const f = D > 0 ? U.clamp01(t / D) : 0;
    $("scrubFill").style.width = `${f * 100}%`;
    $("scrubThumb").style.left = `${f * 100}%`;
    const pb = $("playBtn");
    if (pb.dataset.state !== String(state.playing)) {
      pb.dataset.state = String(state.playing);
      pb.innerHTML = state.playing ? ICONS.pause : ICONS.play;
    }
    $("playBtn").setAttribute("aria-label", state.playing ? "Pause" : "Play");
  }
  (() => {
    const scrub = $("scrub");
    let d = false;
    const at = (e) => {
      const r = scrub.getBoundingClientRect();
      seek(U.clamp01((e.clientX - r.left) / r.width) * timelineDur());
    };
    scrub.addEventListener("pointerdown", (e) => {
      d = true;
      scrub.setPointerCapture(e.pointerId);
      at(e);
    });
    scrub.addEventListener("pointermove", (e) => d && at(e));
    scrub.addEventListener("pointerup", () => (d = false));
    $("playBtn").addEventListener("click", () => setPlaying(!state.playing));
    $("stepBack").addEventListener("click", () => stepFrame(-1));
    $("stepFwd").addEventListener("click", () => stepFrame(1));
  })();

  /* =========================================================================
     Main loop
     ========================================================================= */
  let lastNow = performance.now();
  let exporting = false;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - lastNow) / 1000);
    lastNow = now;
    if (!src || !R || exporting) return;
    const s = eff();
    const anim = hasAnimFx(s);
    if (src.kind === "video") state.time = src.video.currentTime;
    else if (state.playing && (src.animated || anim)) {
      state.time += dt;
      const D = timelineDur();
      if (D > 0 && state.time >= D) state.time %= D;
    }
    const t = state.time;
    let cpu = false;
    try {
      cpu = runCPU(s, t);
    } catch (err) {
      console.error(err);
      ui.toast(`Render error: ${err.message}`, "error");
      state.preview = null;
      return;
    }
    const tick = anim && state.playing;
    if (cpu || dirty.gl || tick || (src.animated && state.playing)) {
      const t0 = performance.now();
      target = R.renderImage(buildParams(s, t), 1);
      pipe.glMs = performance.now() - t0;
      dirty.gl = false;
      dirty.view = true;
    }
    if (view.splitOn || view.holdOrig) {
      const before = pipe.oKey;
      ensureOriginal(t);
      if (before !== pipe.oKey) dirty.view = true;
    }
    if (dirty.view) {
      R.present(target, viewParams());
      dirty.view = false;
      target = null;
      updateOverlay();
    }
    updateTransport(false);
  }

  /* =========================================================================
     History
     ========================================================================= */
  const historyList = $("historyList");
  function pushHistory(label) {
    state.hist = state.hist.slice(0, state.hi + 1);
    state.hist.push({ label, s: U.deepClone(state.s) });
    if (state.hist.length > 200) state.hist.shift();
    state.hi = state.hist.length - 1;
    renderHistory();
  }
  function jumpHistory(i) {
    if (i < 0 || i >= state.hist.length) return;
    state.hi = i;
    state.s = U.deepClone(state.hist[i].s);
    state.preview = null;
    syncAll();
    saveSettings();
    renderHistory();
  }
  const undo = () => state.hi > 0 && (jumpHistory(state.hi - 1), ui.toast(`Undo ${state.hist[state.hi + 1].label}`));
  const redo = () => state.hi < state.hist.length - 1 && (jumpHistory(state.hi + 1), ui.toast(`Redo ${state.hist[state.hi].label}`));
  function renderHistory() {
    historyList.textContent = "";
    for (let i = state.hist.length - 1; i >= 0; i--) {
      const h = state.hist[i];
      const li = el("li", { class: `${i === state.hi ? "cur" : ""} ${i > state.hi ? "future" : ""}` }, el("button", { type: "button", title: h.label }, h.label));
      li.firstChild.addEventListener("click", () => jumpHistory(i));
      historyList.append(li);
    }
    $("undoBtn").disabled = state.hi <= 0;
    $("redoBtn").disabled = state.hi >= state.hist.length - 1;
  }

  /* =========================================================================
     Inspector (schema-driven)
     ========================================================================= */
  const signed = (d) => (v) => (v > 0 ? "+" : "") + v.toFixed(d);
  const pct = (v) => `${Math.round(v)}`;
  const deg = (v) => `${Math.round(v * 10) / 10}°`;
  const pxf = (d = 0) => (v) => `${v.toFixed(d)}px`;
  const Sl = (k, label, min, max, step, o = {}) => ({ k, t: "slider", label, min, max, step, ...o });
  const Sw = (k, label, o = {}) => ({ k, t: "switch", label, ...o });
  const Sg = (k, label, options, o = {}) => ({ k, t: "seg", label, options, ...o });
  const Se = (k, label, options, o = {}) => ({ k, t: "select", label, options, ...o });
  const Co = (k, label, o = {}) => ({ k, t: "color", label, ...o });

  const PANELS = [
    {
      id: "output", title: "Output",
      controls: [
        Sl("outWidth", "Width", 128, 6000, 1, { format: (v) => `${v}`, hint: "Output width in pixels; height follows the source aspect ratio." }),
        { t: "widths" },
        Sg("transparent", "Knockout", [
          { value: "off", label: "Off" }, { value: "darkest", label: "Darkest" }, { value: "lightest", label: "Lightest" }
        ], { hint: "Make the darkest or lightest palette colour transparent (halftone/ASCII: the paper)." })
      ]
    },
    {
      id: "dither", title: "Dither",
      controls: [
        Sg("mode", null, MODES.map((m) => ({ value: m.value, label: m.label, short: m.short, hint: `${m.label} — key ${m.key}` })), { cols: 4, histLabel: "Mode" }),
        Sl("pixelSize", "Pixel size", 1, 24, 1, { format: (v) => `${v}×`, showIf: isGrid, hint: "Size of one dither pixel. [ and ] step it." }),
        Se("kernel", "Kernel", Object.entries(E.KERNELS).map(([v, k]) => ({ value: v, label: k.label })), { showIf: (s) => s.mode === "diffusion" }),
        Sl("diffusion", "Diffusion", 0, 100, 1, { format: pct, showIf: (s) => s.mode === "diffusion", hint: "Share of quantisation error pushed to neighbours" }),
        Sw("serpentine", "Serpentine scan", { showIf: (s) => s.mode === "diffusion", hint: "Alternate scan direction per row — removes directional worming" }),
        Sg("bayerSize", "Matrix", [2, 4, 8, 16].map((n) => ({ value: n, label: `${n}×${n}` })), { showIf: (s) => s.mode === "ordered" }),
        Sl("spread", "Spread", 0, 200, 1, { format: pct, showIf: (s) => ["ordered", "bluenoise", "random"].includes(s.mode), hint: "Pattern strength" }),
        Sl("threshold", "Threshold", 0, 100, 1, { format: pct, showIf: (s) => s.mode === "threshold" }),
        Sl("seed", "Seed", 1, 999, 1, { showIf: (s) => ["bluenoise", "random"].includes(s.mode) || (s.mode === "diffusion" && s.crawl) }),
        Sw("crawl", "Crawl", { showIf: isGrid, hint: "Re-dither every frame for a living, boiling texture" }),
        Sl("crawlRate", "Crawl rate", 1, 30, 1, { format: (v) => `${v} fps`, showIf: (s) => isGrid(s) && s.crawl }),
        Sw("linearLight", "Linear light", { hint: "Dither in linear light (physically correct average tone). Off = perceptual, punchier." })
      ]
    },
    {
      id: "halftone", title: "Halftone", showIf: (s) => s.mode === "halftone",
      controls: [
        Sg("htScreen", null, [{ value: "mono", label: "Mono" }, { value: "cmyk", label: "CMYK" }], { histLabel: "Screen" }),
        Sl("htCell", "Cell size", 3, 64, 0.5, { format: pxf(1), hint: "Screen period in output pixels" }),
        Se("htShape", "Dot", [
          { value: "round", label: "Round" }, { value: "euclid", label: "Euclidean" }, { value: "ellipse", label: "Ellipse" },
          { value: "diamond", label: "Diamond" }, { value: "square", label: "Square" }, { value: "line", label: "Line" }
        ]),
        Sl("htAngle", "Angle", -90, 90, 0.5, { format: deg, bipolar: true, default: 45, showIf: (s) => s.htScreen === "mono" }),
        Sl("htGain", "Dot gain", -50, 50, 1, { format: signed(0), bipolar: true }),
        Sl("htSoft", "Softness", 0, 100, 1, { format: pct, hint: "Ink bleed — soft, riso-like dot edges" }),
        Sl("htGcr", "Black gen.", 0, 100, 1, { format: pct, showIf: (s) => s.htScreen === "cmyk", hint: "Grey-component replacement: how much shared CMY moves to the K plate" }),
        Co("htInk", "Ink", { showIf: (s) => s.htScreen === "mono" }),
        Co("htPaper", "Paper"),
        { t: "plates", showIf: (s) => s.htScreen === "cmyk" }
      ]
    },
    {
      id: "ascii", title: "ASCII", showIf: (s) => s.mode === "ascii",
      controls: [
        Se("asciiSet", "Set", [
          { value: "classic", label: "Classic  .:-=+*#%@" }, { value: "dense", label: "Dense (70)" }, { value: "blocks", label: "Blocks ░▒▓█" },
          { value: "binary", label: "Binary 01" }, { value: "dots", label: "Dots ·•●" }, { value: "slashes", label: "Slashes ./\\|X#" }, { value: "custom", label: "Custom" }
        ]),
        { t: "text", k: "asciiChars", label: "Glyphs" },
        Sl("asciiCell", "Char width", 3, 32, 1, { format: pxf(0) }),
        Sl("asciiAspect", "Line height", 1, 2.6, 0.05, { format: (v) => `${v.toFixed(2)}×` }),
        Se("asciiFont", "Font", ["Menlo", "Monaco", "SF Mono", "Courier New", "Andale Mono", "PT Mono", "IBM Plex Mono"].map((f) => ({ value: f, label: f }))),
        Sg("asciiWeight", "Weight", [{ value: "normal", label: "Regular" }, { value: "bold", label: "Bold" }]),
        Sg("asciiBg", "Ground", [{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }], { hint: "Which end of the palette is the background" }),
        Sw("asciiSourceColor", "Source colour", { hint: "Colour each glyph with the image instead of the palette" }),
        Sw("asciiSort", "Sort glyphs by ink", { hint: "Order glyphs by measured density instead of typed order" })
      ]
    },
    {
      id: "palette", title: "Palette", showIf: (s) => s.mode !== "halftone",
      controls: [
        { t: "palette" },
        Sg("colorMode", "Mapping", [{ value: "tone", label: "Tone map" }, { value: "nearest", label: "Nearest colour" }], {
          showIf: isGrid, hint: "Tone map: luminance through the swatches (shadows → highlights). Nearest: full-colour quantise in OKLab."
        }),
        Sl("levels", "Levels", 0, 16, 1, { format: (v) => (v < 2 ? "Swatches" : `${v}`), hint: "0 uses the swatches as-is; 2–16 interpolates an OKLab ramp through them" }),
        Sw("matchLightness", "Place by lightness", { showIf: (s) => !(isGrid(s) && s.colorMode === "nearest"), hint: "Position each swatch on the tone ramp by its actual lightness (tone-accurate) instead of evenly" })
      ]
    },
    {
      id: "tone", title: "Tone",
      controls: [
        { t: "curve" },
        Sl("exposure", "Exposure", -3, 3, 0.01, { format: signed(2), bipolar: true }),
        Sl("contrast", "Contrast", -100, 100, 1, { format: signed(0), bipolar: true }),
        Sl("blackPoint", "Black point", 0, 60, 1, { format: pct }),
        Sl("whitePoint", "White point", 40, 100, 1, { format: pct, default: 100 }),
        Sl("detail", "Detail", -100, 100, 1, { format: signed(0), bipolar: true, hint: "Negative softens, positive sharpens — applied before dithering" }),
        Sl("saturation", "Saturation", 0, 200, 1, { format: pct, default: 100, showIf: needColor }),
        Sl("hue", "Hue shift", -180, 180, 1, { format: deg, bipolar: true, showIf: needColor }),
        Sw("invert", "Invert")
      ]
    },
    {
      id: "glow", title: "Glow", toggle: "bloomOn",
      controls: [
        Sl("bloomAmount", "Amount", 0, 150, 1, { format: pct }),
        Sl("bloomThreshold", "Threshold", 0, 100, 1, { format: pct }),
        Sl("bloomKnee", "Knee", 0, 50, 1, { format: pct, hint: "Softness of the threshold" }),
        Sl("bloomRadius", "Radius", 0, 100, 1, { format: pct }),
        Co("bloomTint", "Tint"),
        Sl("bloomCore", "Core", 0, 100, 1, { format: pct, hint: "Adds the unblurred highlights back on top — emissive pixels" }),
        Sl("bloomGrain", "Grain", 0, 100, 1, { format: pct })
      ]
    },
    {
      id: "halation", title: "Halation", toggle: "halOn",
      controls: [
        Sl("halAmount", "Amount", 0, 150, 1, { format: pct }),
        Sl("halThreshold", "Threshold", 0, 100, 1, { format: pct }),
        Sl("halRadius", "Radius", 0, 100, 1, { format: pct }),
        Co("halTint", "Tint")
      ]
    },
    {
      id: "chroma", title: "Chromatic Aberration", toggle: "caOn",
      controls: [
        Sg("caMode", null, [{ value: "radial", label: "Radial" }, { value: "linear", label: "Linear" }], { histLabel: "Aberration" }),
        Sl("caAmount", "Amount", 0, 12, 0.1, { format: pxf(1) }),
        Sl("caAngle", "Angle", -180, 180, 1, { format: deg, bipolar: true, showIf: (s) => s.caMode === "linear" }),
        Sl("caFalloff", "Edge weight", 0, 100, 1, { format: pct }),
        Sl("caR", "Red", -2, 2, 0.01, { format: signed(2), bipolar: true, default: 1 }),
        Sl("caG", "Green", -2, 2, 0.01, { format: signed(2), bipolar: true }),
        Sl("caB", "Blue", -2, 2, 0.01, { format: signed(2), bipolar: true, default: -1 })
      ]
    },
    {
      id: "motion", title: "Motion",
      controls: [
        Sl("loop", "Loop length", 0.5, 20, 0.1, { format: (v) => `${v.toFixed(1)}s`, hint: "Every motion effect completes whole cycles in this time, so exports loop seamlessly" }),
        Sw("shimmerOn", "Shimmer"),
        Sl("shimmerAmount", "Amount", 0, 100, 1, { format: pct, showIf: (s) => s.shimmerOn }),
        Sl("shimmerScale", "Scale", 1, 32, 0.5, { format: pxf(1), showIf: (s) => s.shimmerOn }),
        Sl("shimmerSpeed", "Speed", 0.1, 6, 0.1, { format: (v) => v.toFixed(1), showIf: (s) => s.shimmerOn }),
        Sg("shimmerNoise", "Noise", [{ value: "blue", label: "Blue" }, { value: "value", label: "Value" }], { showIf: (s) => s.shimmerOn }),
        Sw("waveOn", "Wave warp"),
        Sl("waveAmount", "Amount", 0, 100, 1, { format: pct, showIf: (s) => s.waveOn }),
        Sl("waveFreq", "Frequency", 0.1, 8, 0.1, { format: (v) => v.toFixed(1), showIf: (s) => s.waveOn }),
        Sl("waveSpeed", "Speed", 0.1, 8, 0.1, { format: (v) => v.toFixed(1), showIf: (s) => s.waveOn }),
        Sw("glitchOn", "Glitch"),
        Sl("glitchAmount", "Amount", 0, 100, 1, { format: pct, showIf: (s) => s.glitchOn })
      ]
    },
    {
      id: "finish", title: "Finish",
      controls: [
        Sw("grainOn", "Film grain"),
        Sl("grainAmount", "Amount", 0, 100, 1, { format: pct, showIf: (s) => s.grainOn }),
        Sl("grainSize", "Size", 0.5, 6, 0.1, { format: pxf(1), showIf: (s) => s.grainOn }),
        Sw("grainAnimate", "Animate grain", { showIf: (s) => s.grainOn }),
        Sl("vignette", "Vignette", -100, 100, 1, { format: signed(0), bipolar: true }),
        Sl("scanlines", "Scanlines", 0, 100, 1, { format: pct }),
        Sl("scanPx", "Line pitch", 2, 12, 0.5, { format: pxf(1), showIf: (s) => s.scanlines > 0 }),
        Sl("prism", "Prism wash", 0, 100, 1, { format: pct })
      ]
    }
  ];

  const ctrls = {};
  const labels = {};
  const formats = {};
  const optLabels = {};
  const toggleOwner = {};
  const visRules = [];
  let curveEditor = null, paletteEditor = null;

  function describe(k, v) {
    if (optLabels[k]) return optLabels[k][String(v)] ?? String(v);
    const f = formats[k];
    if (typeof v === "boolean") return v ? "on" : "off";
    if (f) return f(v);
    return typeof v === "string" ? v : "";
  }
  function setLive(k, v) {
    state.s[k] = v;
    const owner = toggleOwner[k];
    if (owner && !state.s[owner]) {
      state.s[owner] = true;
      ctrls[owner] && ctrls[owner].set(true);
      refreshPanelStates();
    }
    state.preview = null;
    markDirty();
    saveSettings();
  }
  function commit(k, v, label) {
    state.s[k] = v;
    const owner = toggleOwner[k];
    if (owner && !state.s[owner] && k !== owner) {
      state.s[owner] = true;
      ctrls[owner] && ctrls[owner].set(true);
      refreshPanelStates();
    }
    state.preview = null;
    clearPresetMark();
    markDirty();
    saveSettings();
    refreshVisibility();
    pushHistory(label || `${labels[k] || k}${optLabels[k] ? ":" : ""} ${describe(k, v)}`.trim());
  }
  function commitMany(patch, label) {
    Object.assign(state.s, patch);
    state.preview = null;
    clearPresetMark();
    syncAll();
    saveSettings();
    pushHistory(label);
  }

  function buildControl(c, panel) {
    const val = state.s[c.k];
    const def = c.default ?? DEFAULTS[c.k];
    let w;
    const onCommit = (v) => commit(c.k, v);
    switch (c.t) {
      case "slider":
        w = new ui.Slider({ ...c, value: val, default: def, onInput: (v) => setLive(c.k, v), onCommit });
        break;
      case "switch":
        w = new ui.Switch({ label: c.label, value: val, hint: c.hint, onCommit });
        break;
      case "seg":
        w = new ui.Seg({ label: c.label, options: c.options, value: val, cols: c.cols, onCommit });
        break;
      case "select":
        w = new ui.Select({
          label: c.label, options: c.options, value: val,
          onCommit: (v) => {
            if (c.k === "asciiSet" && v !== "custom") {
              state.s.asciiChars = E.ASCII_SETS[v];
              ctrls.asciiChars && ctrls.asciiChars.set(state.s.asciiChars);
            }
            commit(c.k, v);
          }
        });
        break;
      case "color":
        w = new ui.ColorField({ label: c.label, value: val, onInput: (v) => setLive(c.k, v), onCommit });
        break;
      case "text": {
        const inp = el("input", { type: "text", class: "text-in", spellcheck: "false", value: val, "aria-label": c.label });
        inp.addEventListener("keydown", (e) => {
          e.stopPropagation();
          if (e.key === "Enter") inp.blur();
        });
        inp.addEventListener("input", () => {
          if (inp.value.length) setLive(c.k, inp.value);
        });
        inp.addEventListener("change", () => {
          if (!inp.value.length) inp.value = state.s[c.k];
          state.s.asciiSet = "custom";
          ctrls.asciiSet && ctrls.asciiSet.set("custom");
          commit(c.k, inp.value, "Glyphs");
        });
        w = { el: el("div", { class: "row text-row" }, el("span", { class: "sl-label plain" }, c.label), inp), set: (v) => (inp.value = v) };
        break;
      }
      case "curve":
        return buildCurve();
      case "palette":
        return buildPalette();
      case "plates":
        return buildPlates();
      case "widths": {
        const row = el("div", { class: "mini-row widths" }, el("span", { class: "sl-label plain" }, ""));
        [["Source", 0], ["1080", 1080], ["1600", 1600], ["2048", 2048], ["3840", 3840]].forEach(([label, w]) => {
          const b = el("button", { type: "button", class: "mini-btn", title: w ? `${w}px wide` : "Match the source width" }, label);
          b.addEventListener("click", () => {
            const v = w || (src ? U.clamp(src.width, 64, 8192) : 1600);
            ctrls.outWidth.set(v);
            commit("outWidth", v, `Width ${v}`);
          });
          row.append(b);
        });
        return row;
      }
      default:
        return null;
    }
    if (c.hint && w.el && !w.el.title) w.el.title = c.hint;
    ctrls[c.k] = w;
    labels[c.k] = c.histLabel || c.label || panel.title;
    if (c.options) optLabels[c.k] = Object.fromEntries(c.options.map((o) => [String(o.value), o.label]));
    if (c.format) formats[c.k] = c.format;
    if (panel.toggle) toggleOwner[c.k] = panel.toggle;
    return w.el;
  }

  function buildCurve() {
    const presets = [
      ["Linear", [[0, 0], [1, 1]]],
      ["Medium contrast", [[0, 0], [0.25, 0.2], [0.75, 0.8], [1, 1]]],
      ["Strong contrast", [[0, 0], [0.25, 0.14], [0.75, 0.86], [1, 1]]],
      ["Matte / faded", [[0, 0.12], [0.3, 0.3], [0.75, 0.78], [1, 0.95]]],
      ["Crushed shadows", [[0, 0], [0.2, 0], [0.6, 0.62], [1, 1]]],
      ["Lifted shadows", [[0, 0], [0.25, 0.36], [1, 1]]],
      ["High key", [[0, 0.05], [0.5, 0.68], [1, 1]]],
      ["Low key", [[0, 0], [0.5, 0.34], [1, 0.94]]]
    ];
    curveEditor = new ui.CurveEditor({
      value: state.s.curve,
      onInput: (pts) => setLive("curve", pts),
      onCommit: (pts) => commit("curve", pts, "Tone curve")
    });
    const pBtn = el("button", { type: "button", class: "mini-btn" }, "Curve presets ▾");
    pBtn.addEventListener("click", () =>
      ui.menu(pBtn, presets.map(([label, pts]) => ({ label, pts })), (it) => {
        curveEditor.set(it.pts);
        commit("curve", U.deepClone(it.pts), `Curve: ${it.label}`);
      })
    );
    const rBtn = el("button", { type: "button", class: "mini-btn" }, "Reset");
    rBtn.addEventListener("click", () => {
      curveEditor.set([[0, 0], [1, 1]]);
      commit("curve", [[0, 0], [1, 1]], "Curve reset");
    });
    ctrls.curve = { set: (v) => curveEditor.set(v) };
    return el("div", { class: "curve-wrap" }, curveEditor.el, el("div", { class: "mini-row" }, pBtn, rBtn, el("span", { class: "grow" }), el("span", { class: "dim small" }, "click add · drag · dbl-click remove")));
  }

  function buildPalette() {
    paletteEditor = new ui.PaletteEditor({
      value: state.s.palette,
      onInput: (cols) => setLive("palette", cols),
      onCommit: (cols) => commit("palette", cols, "Palette edit")
    });
    const lib = el("button", { type: "button", class: "mini-btn" }, "Library ▾");
    lib.addEventListener("click", () =>
      ui.menu(lib, PALETTES.map(([label, cols]) => ({ label, cols, swatches: cols.length > 10 ? cols.filter((_, i) => i % 2 === 0) : cols })), (it) => {
        commitMany({ palette: it.cols.slice(), levels: 0 }, `Palette: ${it.label}`);
      })
    );
    const ext = el("button", { type: "button", class: "mini-btn", title: "Pick colours from the image with k-means in OKLab" }, "Extract ▾");
    ext.addEventListener("click", () =>
      ui.menu(ext, [2, 3, 4, 5, 6, 8, 12, 16].map((n) => ({ label: `${n} colours`, n })), (it) => {
        if (!src) return;
        const img = sampleSource(src, Math.min(320, src.width), Math.max(1, Math.round((Math.min(320, src.width) * src.height) / src.width)), state.time);
        pipe.sKey = "";
        const cols = E.extractPalette(img, it.n);
        commitMany({ palette: cols, levels: 0, matchLightness: true }, `Extract ${it.n} colours`);
      })
    );
    const more = el("button", { type: "button", class: "mini-btn" }, "⋯");
    more.addEventListener("click", () =>
      ui.menu(more, [
        { label: "Reverse", id: "rev" },
        { label: "Sort by lightness", id: "sort" },
        { label: "Copy hex list", id: "copy" },
        { label: "Paste hex list", id: "paste" }
      ], async (it) => {
        const p = state.s.palette.slice();
        if (it.id === "rev") commitMany({ palette: p.reverse() }, "Palette reversed");
        else if (it.id === "sort") commitMany({ palette: p.sort((a, b) => U.luma(U.hexToRgb(a)) - U.luma(U.hexToRgb(b))) }, "Palette sorted");
        else if (it.id === "copy") {
          await navigator.clipboard.writeText(p.join(", ")).catch(() => {});
          ui.toast("Palette copied");
        } else if (it.id === "paste") {
          let text = "";
          try {
            text = await navigator.clipboard.readText();
          } catch (_e) {
            text = window.prompt("Paste hex colours (any separator):", "") || "";
          }
          const cols = U.parseHexList(text);
          if (cols.length >= 2) commitMany({ palette: cols, levels: 0 }, `Pasted ${cols.length} colours`);
          else ui.toast("Need at least two hex colours on the clipboard", "error");
        }
      })
    );
    ctrls.palette = { set: (v) => paletteEditor.set(v) };
    return el("div", { class: "pal-wrap" }, el("div", { class: "pal-caption dim small" }, el("span", {}, "Shadows"), el("span", {}, "Highlights")), paletteEditor.el, el("div", { class: "mini-row" }, lib, ext, more));
  }

  function buildPlates() {
    const head = el("div", { class: "plates-head" }, el("span", {}, "Plate"), el("span", {}, "Angle"), el("span", {}, "Ink %"), el("span", {}, "X"), el("span", {}, "Y"));
    const rows = PLATES.map(([p]) => {
      const inkKey = `pl${p}ink`;
      const well = el("span", { class: "cf-well sm" });
      const picker = el("input", { type: "color", class: "cf-picker", "aria-label": `${p} ink` });
      well.append(picker);
      picker.addEventListener("input", () => {
        well.style.background = picker.value;
        setLive(inkKey, picker.value);
      });
      picker.addEventListener("change", () => commit(inkKey, picker.value, `${p} ink`));
      const sc = (suffix, o) => {
        const k = `pl${p}${suffix}`;
        const w = new ui.Scrub({ ...o, value: state.s[k], default: DEFAULTS[k], onInput: (v) => setLive(k, v), onCommit: (v) => commit(k, v, `${p} ${o.label} ${o.format ? o.format(v) : v}`) });
        ctrls[k] = w;
        return w.el;
      };
      ctrls[inkKey] = { set: (v) => { picker.value = v; well.style.background = v; } };
      ctrls[inkKey].set(state.s[inkKey]);
      return el(
        "div", { class: "plate-row" },
        el("span", { class: "plate-name" }, well, p),
        sc("ang", { label: "angle", min: -180, max: 180, step: 0.5, perPx: 0.5, format: (v) => `${v}°` }),
        sc("op", { label: "ink", min: 0, max: 100, step: 1, perPx: 1 }),
        sc("dx", { label: "X", min: -40, max: 40, step: 0.1, perPx: 0.1 }),
        sc("dy", { label: "Y", min: -40, max: 40, step: 0.1, perPx: 0.1 })
      );
    });
    const mis = el("button", { type: "button", class: "mini-btn", title: "Randomly offset each plate by up to ±3px" }, "Misregister");
    mis.addEventListener("click", () => {
      const r = U.mulberry32((Math.random() * 1e9) | 0);
      const patch = {};
      for (const [p] of PLATES) {
        patch[`pl${p}dx`] = Math.round((r() - 0.5) * 60) / 10;
        patch[`pl${p}dy`] = Math.round((r() - 0.5) * 60) / 10;
      }
      commitMany(patch, "Misregister plates");
    });
    const reg = el("button", { type: "button", class: "mini-btn" }, "Register");
    reg.addEventListener("click", () => {
      const patch = {};
      for (const [p] of PLATES) patch[`pl${p}dx`] = patch[`pl${p}dy`] = 0;
      commitMany(patch, "Register plates");
    });
    const resetInks = el("button", { type: "button", class: "mini-btn" }, "Process inks");
    resetInks.addEventListener("click", () => {
      const patch = {};
      for (const [p, ink, ang] of PLATES) Object.assign(patch, { [`pl${p}ink`]: ink, [`pl${p}ang`]: ang, [`pl${p}op`]: 100 });
      commitMany(patch, "Process inks");
    });
    return el("div", { class: "plates" }, head, rows, el("div", { class: "mini-row" }, mis, reg, resetInks));
  }

  const panelEls = {};
  function buildInspector() {
    const insp = $("inspector");
    insp.textContent = "";
    for (const panel of PANELS) {
      const body = el("div", { class: "panel-body" });
      for (const c of panel.controls) {
        const node = buildControl(c, panel);
        if (!node) continue;
        body.append(node);
        if (c.showIf) visRules.push({ node, fn: c.showIf });
      }
      const chev = el("span", { class: "chev", "aria-hidden": "true" });
      const title = el("button", { type: "button", class: "panel-title", "aria-expanded": "true", title: "Click to fold · ⌥-click to solo" }, chev, panel.title);
      const head = el("div", { class: "panel-head" }, title);
      if (panel.toggle) {
        const sw = new ui.Switch({ label: `Enable ${panel.title}`, value: state.s[panel.toggle], bare: true, onCommit: (v) => { commit(panel.toggle, v, `${panel.title} ${v ? "on" : "off"}`); refreshPanelStates(); } });
        ctrls[panel.toggle] = sw;
        labels[panel.toggle] = panel.title;
        head.append(sw.el);
      }
      const reset = el("button", { type: "button", class: "panel-reset", title: `Reset ${panel.title}` }, "Reset");
      reset.addEventListener("click", () => {
        const patch = {};
        for (const c of panel.controls) {
          if (c.k) patch[c.k] = U.deepClone(DEFAULTS[c.k]);
          if (c.t === "curve") patch.curve = U.deepClone(DEFAULTS.curve);
          if (c.t === "palette") patch.palette = DEFAULTS.palette.slice();
          if (c.t === "plates") for (const k of Object.keys(DEFAULTS)) if (k.startsWith("pl")) patch[k] = DEFAULTS[k];
        }
        if (panel.id === "output") delete patch.outWidth;
        commitMany(patch, `Reset ${panel.title}`);
      });
      head.append(reset);
      const sec = el("section", { class: "panel", "data-id": panel.id }, head, body);
      title.addEventListener("click", (e) => {
        if (e.altKey) {
          // solo: open this panel, fold every other one
          for (const id of Object.keys(panelEls)) prefs.collapsed[id] = id !== panel.id;
          savePrefs();
          refreshPanelStates();
          sec.scrollIntoView({ block: "nearest" });
          return;
        }
        prefs.collapsed[panel.id] = !prefs.collapsed[panel.id];
        savePrefs();
        refreshPanelStates();
      });
      panelEls[panel.id] = { sec, title, panel };
      insp.append(sec);
    }
    refreshVisibility();
    refreshPanelStates();
  }
  function refreshPanelStates() {
    for (const { sec, title, panel } of Object.values(panelEls)) {
      const col = !!prefs.collapsed[panel.id];
      sec.classList.toggle("collapsed", col);
      title.setAttribute("aria-expanded", String(!col));
      sec.classList.toggle("off", !!panel.toggle && !state.s[panel.toggle]);
    }
  }
  function refreshVisibility() {
    const s = state.s;
    for (const r of visRules) r.node.classList.toggle("hide", !r.fn(s));
    for (const { sec, panel } of Object.values(panelEls)) sec.classList.toggle("hide", !!panel.showIf && !panel.showIf(s));
    updateTransport(true);
  }
  function syncAll() {
    for (const [k, w] of Object.entries(ctrls)) if (k in state.s && w.set) w.set(state.s[k]);
    refreshVisibility();
    refreshPanelStates();
    markDirty();
  }

  /* =========================================================================
     Presets
     ========================================================================= */
  let userPresets = store.get(LS.presets, []);
  const presetList = $("presetList");
  const applyLook = (look) => {
    const s = sanitize({ ...DEFAULTS, ...look });
    for (const k of OUTPUT_KEYS) s[k] = state.s[k];
    return s;
  };
  let hoverTimer = 0;
  function clearPresetMark() {
    if (!state.presetName) return;
    state.presetName = null;
    presetList.querySelectorAll(".preset.on").forEach((b) => b.classList.remove("on"));
  }
  function presetItem(p, user) {
    const modeLabel = (MODES.find((m) => m.value === (p.s.mode || "diffusion")) || MODES[0]).short;
    const b = el("button", { type: "button", class: `preset ${state.presetName === p.name ? "on" : ""}`, title: `${p.name} — click to apply, hover to preview` }, el("span", { class: "preset-name" }, p.name), el("span", { class: "preset-tag" }, modeLabel));
    b.addEventListener("mouseenter", () => {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        state.preview = applyLook(p.s);
        markDirty();
      }, 110);
    });
    b.addEventListener("mouseleave", () => {
      clearTimeout(hoverTimer);
      if (state.preview) {
        state.preview = null;
        markDirty();
      }
    });
    b.addEventListener("click", () => {
      clearTimeout(hoverTimer);
      state.s = applyLook(p.s);
      state.preview = null;
      state.presetName = p.name;
      syncAll();
      saveSettings();
      pushHistory(`Preset: ${p.name}`);
      renderPresets();
    });
    if (!user) return b;
    const del = el("button", { type: "button", class: "preset-del", title: `Delete “${p.name}”` }, "×");
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      userPresets = userPresets.filter((q) => q !== p);
      store.set(LS.presets, userPresets);
      renderPresets();
      ui.toast(`Deleted preset “${p.name}”`);
    });
    return el("div", { class: "preset-wrap" }, b, del);
  }
  function renderPresets() {
    presetList.textContent = "";
    if (userPresets.length) {
      presetList.append(el("div", { class: "preset-group" }, "Mine"));
      userPresets.forEach((p) => presetList.append(presetItem(p, true)));
    }
    presetList.append(el("div", { class: "preset-group" }, "Built-in"));
    BUILTIN.forEach((p) => presetList.append(presetItem(p, false)));
  }
  function savePresetFlow() {
    const existing = document.querySelector(".preset-save");
    if (existing) return existing.querySelector("input").focus();
    const inp = el("input", { type: "text", placeholder: "Preset name", "aria-label": "Preset name", spellcheck: "false" });
    const form = el("form", { class: "preset-save" }, inp, el("button", { type: "submit", class: "mini-btn" }, "Save"));
    const done = () => form.remove();
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = inp.value.trim();
      if (!name) return done();
      const look = U.deepClone(state.s);
      for (const k of OUTPUT_KEYS) delete look[k];
      const i = userPresets.findIndex((p) => p.name === name);
      if (i >= 0) userPresets[i].s = look;
      else userPresets.unshift({ name, s: look });
      store.set(LS.presets, userPresets);
      state.presetName = name;
      done();
      renderPresets();
      ui.toast(i >= 0 ? `Updated preset “${name}”` : `Saved preset “${name}”`);
    });
    inp.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape") done();
    });
    inp.addEventListener("blur", () => setTimeout(() => form.isConnected && !inp.value && done(), 150));
    presetList.parentNode.insertBefore(form, presetList);
    inp.focus();
  }
  $("savePresetBtn").addEventListener("click", savePresetFlow);
  $("presetMenuBtn").addEventListener("click", (e) =>
    ui.menu(e.currentTarget, [{ label: "Export my presets…", id: "exp" }, { label: "Import presets…", id: "imp" }], (it) => {
      if (it.id === "exp") {
        if (!userPresets.length) return ui.toast("No saved presets yet");
        U.downloadBlob(new Blob([JSON.stringify({ app: "dither-lab", version: 2, presets: userPresets }, null, 2)], { type: "application/json" }), "dither-lab-presets.json");
      } else {
        const inp = el("input", { type: "file", accept: "application/json,.json" });
        inp.addEventListener("change", async () => {
          try {
            const data = JSON.parse(await inp.files[0].text());
            const list = (data.presets || data).filter((p) => p && p.name && p.s);
            const names = new Set(userPresets.map((p) => p.name));
            list.forEach((p) => !names.has(p.name) && userPresets.push({ name: p.name, s: p.s }));
            store.set(LS.presets, userPresets);
            renderPresets();
            ui.toast(`Imported ${list.length} preset${list.length === 1 ? "" : "s"}`);
          } catch (err) {
            ui.toast(`Import failed: ${err.message}`, "error");
          }
        });
        inp.click();
      }
    })
  );
  $("resetAllBtn").addEventListener("click", () => {
    const keep = {};
    for (const k of OUTPUT_KEYS) keep[k] = state.s[k];
    state.s = { ...U.deepClone(DEFAULTS), ...keep };
    state.presetName = null;
    syncAll();
    saveSettings();
    pushHistory("Reset all");
    renderPresets();
  });

  /* =========================================================================
     Export
     ========================================================================= */
  const dlg = $("exportDialog");
  const FORMATS = [
    { id: "png", label: "PNG", kind: "still" },
    { id: "webp", label: "WebP", kind: "still" },
    { id: "svg", label: "SVG", kind: "vector" },
    { id: "mp4", label: "MP4", kind: "motion" },
    { id: "pngseq", label: "PNG seq", kind: "motion" },
    { id: "txt", label: "Text", kind: "text" }
  ];
  let exFormat = prefs.exFormat, exScale = prefs.exScale;
  const baseName = () => `${U.slug(src ? src.name : "dither")}-${U.slug(state.presetName || eff().mode)}`;
  function refreshExportDialog() {
    const s = state.s;
    const L = pipe.layout;
    if (!L) return;
    if (exFormat === "txt" && s.mode !== "ascii") exFormat = "png";
    $("exFormats").querySelectorAll("button").forEach((b) => {
      b.classList.toggle("on", b.dataset.f === exFormat);
      b.disabled = b.dataset.f === "txt" && s.mode !== "ascii";
    });
    const f = FORMATS.find((x) => x.id === exFormat);
    const motion = f.kind === "motion";
    $("exMotion").classList.toggle("hide", !motion);
    $("exScaleRow").classList.toggle("hide", f.kind === "text");
    $("exScale").querySelectorAll("button").forEach((b) => b.classList.toggle("on", +b.dataset.s === exScale));
    let W = L.outW * exScale, H = L.outH * exScale;
    if (exFormat === "mp4") (W += W & 1), (H += H & 1);
    $("exDims").textContent = f.kind === "text" ? "" : `${W} × ${H}px`;
    const notes = [];
    if (f.kind === "vector") notes.push("Vector output: dither pixels, halftone dots or glyphs only — glow, halation, grain and other post effects are raster-only and not included.");
    if (exFormat === "mp4" && typeof VideoEncoder === "undefined") notes.push("This browser has no WebCodecs encoder — falls back to real-time WebM recording.");
    if (exFormat === "mp4") notes.push("H.264 is 4:2:0 — tiny single-pixel dithers smear. Export at 2× or more to keep them crisp.");
    if (motion && src && src.kind === "video") notes.push("Audio is not carried over.");
    if (motion) {
      const n = Math.max(1, Math.round(+$("exDur").value * +$("exFps").value));
      notes.push(`${n} frames.`);
    }
    $("exNote").textContent = notes.join(" ");
  }
  function openExport() {
    if (!src) return;
    const D = timelineDur();
    $("exDur").value = (Math.round(D * 100) / 100).toString();
    $("exFps").value = String(prefs.exFps);
    $("exQuality").value = prefs.exQuality;
    $("exName").value = baseName();
    refreshExportDialog();
    dlg.showModal();
  }
  (() => {
    const fr = $("exFormats");
    FORMATS.forEach((f) => {
      const b = el("button", { type: "button", "data-f": f.id }, f.label);
      b.addEventListener("click", () => {
        exFormat = f.id;
        prefs.exFormat = f.id;
        savePrefs();
        refreshExportDialog();
      });
      fr.append(b);
    });
    const sr = $("exScale");
    [1, 2, 3, 4].forEach((n) => {
      const b = el("button", { type: "button", class: "seg-btn", "data-s": n }, `${n}×`);
      b.addEventListener("click", () => {
        exScale = n;
        prefs.exScale = n;
        savePrefs();
        refreshExportDialog();
      });
      sr.append(b);
    });
    ["exDur", "exFps", "exQuality"].forEach((id) => $(id).addEventListener("input", refreshExportDialog));
    $("exFull").addEventListener("click", () => {
      $("exDur").value = (Math.round(timelineDur() * 100) / 100).toString();
      refreshExportDialog();
    });
    $("exCancel").addEventListener("click", () => dlg.close());
    $("exCopy").addEventListener("click", async () => {
      dlg.close();
      await copyPng(exScale);
    });
    $("exportForm").addEventListener("submit", (e) => {
      e.preventDefault();
      dlg.close();
      const name = U.slug($("exName").value) || baseName();
      prefs.exFps = +$("exFps").value;
      prefs.exQuality = $("exQuality").value;
      savePrefs();
      runExport(exFormat, exScale, name, +$("exDur").value, +$("exFps").value, $("exQuality").value);
    });
    dlg.addEventListener("keydown", (e) => e.stopPropagation());
  })();

  let cancelExport = false;
  function setBusy(text, frac) {
    const b = $("busy");
    if (text == null) {
      b.classList.remove("show");
      return;
    }
    b.classList.add("show");
    $("busyText").textContent = text;
    $("busyBar").style.width = `${Math.round(U.clamp01(frac ?? 0) * 100)}%`;
    $("busyBar").parentNode.classList.toggle("hide", frac == null);
    $("busyCancel").classList.toggle("hide", frac == null);
  }
  $("busyCancel").addEventListener("click", () => (cancelExport = true));

  function renderStill(s, t, scale, flatten = null) {
    runCPU(s, t, { supersample: s.mode === "ascii" ? Math.min(8, Math.max(2, scale * 2)) : 2 });
    const T = R.renderImage(buildParams(s, t), scale);
    const img = R.read(T, flatten);
    if (s.mode === "ascii" && scale > 1) runCPU(s, t, { supersample: 2 });
    markDirty();
    return img;
  }
  const imageToBlob = (img, type = "image/png", q) =>
    new Promise((res, rej) => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      c.getContext("2d").putImageData(img, 0, 0);
      c.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), type, q);
    });
  async function copyPng(scale = 1) {
    try {
      const img = renderStill(state.s, state.time, scale);
      const blob = await imageToBlob(img);
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      ui.toast(`Copied ${img.width}×${img.height} PNG`);
    } catch (err) {
      ui.toast(`Copy failed: ${err.message}`, "error");
    }
  }
  function withEven(img) {
    if (!(img.width & 1) && !(img.height & 1)) return img;
    const W = img.width + (img.width & 1), H = img.height + (img.height & 1);
    const out = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) {
      const sy = Math.min(y, img.height - 1);
      out.set(img.data.subarray(sy * img.width * 4, (sy + 1) * img.width * 4), y * W * 4);
      if (W !== img.width) out.set(img.data.subarray((sy * img.width + img.width - 1) * 4, (sy * img.width + img.width) * 4), (y * W + W - 1) * 4);
    }
    return new ImageData(out, W, H);
  }
  const seekVideo = (v, t) =>
    new Promise((res) => {
      const done = () => {
        clearTimeout(to);
        v.removeEventListener("seeked", done);
        res();
      };
      const to = setTimeout(done, 3000);
      v.addEventListener("seeked", done);
      v.currentTime = t;
    });

  async function runExport(fmt, scale, name, dur, fps, quality) {
    if (!src || exporting) return;
    const s = U.deepClone(state.s);
    const t = state.time;
    try {
      if (fmt === "png" || fmt === "webp") {
        setBusy("Rendering…");
        await U.breathe();
        const img = renderStill(s, t, scale);
        const blob = await imageToBlob(img, fmt === "png" ? "image/png" : "image/webp", 0.95);
        U.downloadBlob(blob, `${name}.${fmt}`);
        ui.toast(`Saved ${name}.${fmt} · ${img.width}×${img.height}`);
      } else if (fmt === "svg") {
        setBusy("Building SVG…");
        await U.breathe();
        runCPU(s, t);
        let svg;
        const L = pipe.layout;
        if (L.kind === "grid") {
          const A = pipe.tone.A;
          let alpha = false;
          for (let i = 0; i < A.length; i++) if (A[i] < 0.5) { alpha = true; break; }
          svg = X.svgGrid(pipe.res, s.pixelSize, scale, alpha ? A : null);
        } else if (L.kind === "halftone") {
          svg = X.svgHalftone(buildParams(s, t), pipe.toneTex, pipe.tone.w, pipe.tone.h, s, scale);
        } else {
          svg = X.svgAscii(pipe.asc, L.cellW, L.cellH, s.asciiFont, s.asciiWeight, U.rgbToHex(pipe.asc.bg), s.transparent !== "off", scale);
        }
        U.downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${name}.svg`);
        ui.toast(`Saved ${name}.svg · ${(svg.length / 1024 / 1024).toFixed(1)} MB`);
      } else if (fmt === "txt") {
        runCPU(s, t);
        U.downloadBlob(new Blob([pipe.asc.lines.join("\n") + "\n"], { type: "text/plain;charset=utf-8" }), `${name}.txt`);
        ui.toast(`Saved ${name}.txt`);
      } else {
        await exportMotion(fmt, s, scale, name, dur, fps, quality);
      }
    } catch (err) {
      console.error(err);
      ui.toast(`Export failed: ${err.message || err}`, "error");
    } finally {
      setBusy(null);
      markDirty();
    }
  }

  async function exportMotion(fmt, s, scale, name, dur, fps, quality) {
    const n = Math.max(1, Math.round(dur * fps));
    exporting = true;
    cancelExport = false;
    const wasPlaying = state.playing;
    const t0 = state.time;
    if (src.kind === "video") src.video.pause();
    let writer = null, zip = null, rec = null;
    try {
      setBusy("Preparing…", 0);
      await U.breathe();
      // video has no alpha channel: flatten onto black rather than un-premultiplying faint glow
      const flat = fmt === "mp4" ? [0, 0, 0] : null;
      const first = renderStill(s, 0, scale, flat);
      const ev = withEven(first);
      if (fmt === "mp4") {
        const bpp = { standard: 0.18, high: 0.4, max: 0.9 }[quality] || 0.4;
        const bitrate = Math.round(U.clamp(ev.width * ev.height * fps * bpp, 2e6, 2.4e8));
        const cfg = await X.pickH264(ev.width, ev.height, fps, bitrate);
        if (cfg) writer = new X.Mp4Writer(cfg, fps);
        else {
          if (typeof MediaRecorder === "undefined") throw new Error("no video encoder available in this browser");
          rec = await startWebmFallback(ev.width, ev.height, fps);
        }
      } else zip = new X.ZipWriter();
      for (let i = 0; i < n; i++) {
        if (cancelExport) throw new Error("cancelled");
        const t = i / fps;
        if (src.kind === "video") {
          await seekVideo(src.video, src.duration > 0 ? t % src.duration : t);
          src.frames++;
        }
        const img = i === 0 && src.kind !== "video" ? first : renderStill(s, t, scale, flat);
        if (writer) await writer.addImageData(withEven(img));
        else if (rec) await rec.add(withEven(img));
        else {
          const blob = await imageToBlob(img);
          zip.add(`${name}_${String(i + 1).padStart(4, "0")}.png`, new Uint8Array(await blob.arrayBuffer()));
        }
        setBusy(`Rendering frame ${i + 1} / ${n}`, (i + 1) / n);
        await U.yieldTask();
      }
      setBusy("Finalising…", 1);
      let blob, ext;
      if (writer) (blob = await writer.finish()), (ext = "mp4");
      else if (rec) (blob = await rec.finish()), (ext = "webm");
      else (blob = zip.finish()), (ext = "zip");
      U.downloadBlob(blob, `${name}.${ext}`);
      ui.toast(`Saved ${name}.${ext} · ${n} frames · ${(blob.size / 1024 / 1024).toFixed(1)} MB`);
    } catch (err) {
      writer && writer.abort();
      if (err.message === "cancelled") ui.toast("Export cancelled");
      else throw err;
    } finally {
      exporting = false;
      if (src.kind === "video") {
        await seekVideo(src.video, t0);
        if (wasPlaying) src.video.play().catch(() => {});
      }
      state.time = t0;
      pipe.sKey = "";
      markDirty();
    }
  }
  async function startWebmFallback(w, h, fps) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    const stream = c.captureStream(0);
    const track = stream.getVideoTracks()[0];
    const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m)) || "";
    const mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: Math.min(1.5e8, w * h * fps * 0.4) });
    const chunks = [];
    mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    mr.start();
    return {
      async add(img) {
        g.putImageData(img, 0, 0);
        track.requestFrame && track.requestFrame();
        await U.wait(1000 / fps);
      },
      finish: () =>
        new Promise((res) => {
          mr.onstop = () => res(new Blob(chunks, { type: "video/webm" }));
          mr.stop();
        })
    };
  }

  /* =========================================================================
     File input, drag & drop, paste
     ========================================================================= */
  const fileInput = $("fileInput");
  $("openBtn").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    loadFile(fileInput.files[0]);
    fileInput.value = "";
  });
  let dragDepth = 0;
  window.addEventListener("dragenter", (e) => {
    if (![...(e.dataTransfer?.types || [])].includes("Files")) return;
    e.preventDefault();
    dragDepth++;
    document.body.classList.add("dragging");
  });
  window.addEventListener("dragleave", () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) document.body.classList.remove("dragging");
  });
  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", (e) => {
    e.preventDefault();
    dragDepth = 0;
    document.body.classList.remove("dragging");
    const f = e.dataTransfer?.files?.[0];
    if (f) loadFile(f);
  });
  window.addEventListener("paste", (e) => {
    if (e.target.closest && e.target.closest("input, textarea")) return;
    const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
    if (item) {
      e.preventDefault();
      const f = item.getAsFile();
      loadFile(new File([f], `pasted-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`, { type: f.type }));
    }
  });

  /* =========================================================================
     Topbar + keyboard
     ========================================================================= */
  $("undoBtn").addEventListener("click", undo);
  $("redoBtn").addEventListener("click", redo);
  $("splitBtn").addEventListener("click", () => {
    view.splitOn = !view.splitOn;
    dirty.view = true;
  });
  const origBtn = $("origBtn");
  origBtn.addEventListener("pointerdown", () => {
    view.holdOrig = true;
    dirty.view = true;
  });
  const releaseOrig = () => {
    if (!view.holdOrig) return;
    view.holdOrig = false;
    dirty.view = true;
  };
  origBtn.addEventListener("pointerup", releaseOrig);
  origBtn.addEventListener("pointerleave", releaseOrig);
  $("fitBtn").addEventListener("click", setFit);
  $("oneBtn").addEventListener("click", () => setZoom(1));
  $("exportBtn").addEventListener("click", openExport);
  $("helpBtn").addEventListener("click", () => $("helpDialog").showModal());
  $("helpClose").addEventListener("click", () => $("helpDialog").close());
  $("bgBtn").addEventListener("click", (e) =>
    ui.menu(e.currentTarget, [
      { label: "Dark grey", id: "dark" }, { label: "Mid grey", id: "mid" }, { label: "Light grey", id: "light" }, { label: "Black", id: "black" }
    ].map((o) => ({ ...o, hint: prefs.viewBg === o.id ? "✓" : "" })), (it) => {
      prefs.viewBg = it.id;
      savePrefs();
      dirty.view = true;
    })
  );
  function togglePanels() {
    prefs.panels = !prefs.panels;
    document.body.classList.toggle("no-panels", !prefs.panels);
    savePrefs();
    requestAnimationFrame(resizeCanvas);
  }
  document.body.classList.toggle("no-panels", !prefs.panels);

  const onControl = (e) => !!(e.target && e.target.closest && e.target.closest("button, [role=switch], a, .menu"));
  const typing = (e) => {
    const t = e.target;
    return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
  };
  window.addEventListener("keydown", (e) => {
    if (typing(e) || document.querySelector("dialog[open]")) return;
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key;
    if (mod && k.toLowerCase() === "z") {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
    } else if (mod && k.toLowerCase() === "y") {
      e.preventDefault();
      redo();
    } else if (mod && k.toLowerCase() === "o") {
      e.preventDefault();
      fileInput.click();
    } else if (mod && k.toLowerCase() === "e") {
      e.preventDefault();
      if (e.shiftKey) runExport(prefs.exFormat === "txt" || FORMATS.find((f) => f.id === prefs.exFormat).kind === "motion" ? "png" : prefs.exFormat, prefs.exScale, baseName(), 0, 24, "high");
      else openExport();
    } else if (mod && k.toLowerCase() === "s") {
      e.preventDefault();
      savePresetFlow();
    } else if (mod && k.toLowerCase() === "c" && !window.getSelection().toString()) {
      e.preventDefault();
      copyPng(1);
    } else if (mod && k === "0") {
      e.preventDefault();
      setFit();
    } else if (mod && k === "1") {
      e.preventDefault();
      setZoom(1);
    } else if (mod && (k === "=" || k === "+")) {
      e.preventDefault();
      setZoom(view.zoom * 1.25);
    } else if (mod && k === "-") {
      e.preventDefault();
      setZoom(view.zoom / 1.25);
    } else if (mod) {
      return;
    } else if (k === " ") {
      if (onControl(e)) return;
      e.preventDefault();
      if (!spaceDown) {
        spaceDown = true;
        spaceUsed = false;
        viewport.classList.add("space");
      }
    } else if (k === "\\") {
      e.preventDefault();
      if (!view.holdOrig) {
        view.holdOrig = true;
        dirty.view = true;
      }
    } else if (k === "y" || k === "Y") {
      view.splitOn = !view.splitOn;
      dirty.view = true;
    } else if (k === "z" || k === "Z") {
      view.mode === "fit" ? setZoom(1) : setFit();
    } else if (k === "Tab") {
      if (onControl(e)) return;
      e.preventDefault();
      togglePanels();
    } else if (k === "[" || k === "]") {
      const s = state.s;
      const d = k === "]" ? 1 : -1;
      if (isGrid(s)) commit("pixelSize", U.clamp(s.pixelSize + d, 1, 24));
      else if (s.mode === "halftone") commit("htCell", U.clamp(s.htCell + d, 3, 64));
      else commit("asciiCell", U.clamp(s.asciiCell + d, 3, 32));
      syncAll();
    } else if (/^[1-7]$/.test(k)) {
      const m = MODES[+k - 1];
      if (m && state.s.mode !== m.value) {
        commit("mode", m.value);
        syncAll();
      }
    } else if (k === "," || k === ".") {
      stepFrame(k === "," ? -1 : 1);
    } else if (k === "?") {
      $("helpDialog").showModal();
    } else if (k === "Escape") {
      state.preview = null;
      markDirty();
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === " ") {
      spaceDown = false;
      viewport.classList.remove("space");
      if (!spaceUsed && !typing(e) && !document.querySelector("dialog[open]")) setPlaying(!state.playing);
    } else if (e.key === "\\") {
      view.holdOrig = false;
      dirty.view = true;
    }
  });
  window.addEventListener("blur", () => {
    spaceDown = false;
    releaseOrig();
  });
  // Mouse-clicked buttons shouldn't keep focus (so Space/Tab stay global); keyboard focus is untouched.
  document.addEventListener("pointerup", (e) => {
    if (e.pointerType !== "mouse") return;
    const b = e.target.closest && e.target.closest("button");
    if (b && !b.classList.contains("pal-sw") && !b.closest("dialog") && !b.closest(".menu")) setTimeout(() => b.blur());
  });

  /* =========================================================================
     Boot
     ========================================================================= */
  // Installed-app extras: Finder "Open With → Dither Lab" and offline start-up.
  let openedExternally = false;
  if ("launchQueue" in window) {
    window.launchQueue.setConsumer(async (params) => {
      if (!params.files || !params.files.length) return;
      openedExternally = true;
      loadFile(await params.files[0].getFile());
    });
  }
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register("./sw.js").catch((err) => console.warn("service worker not registered:", err));
  }

  async function boot() {
    buildInspector();
    renderPresets();
    state.hist = [{ label: "Session start", s: U.deepClone(state.s) }];
    state.hi = 0;
    renderHistory();
    resizeCanvas();
    requestAnimationFrame(loop);
    let restored = false;
    try {
      const last = await idb.get("last");
      if (openedExternally || src) restored = true;
      else if (last && last.blob) {
        await loadFile(new File([last.blob], last.name, { type: last.type }), { remember: false, restored: true });
        restored = !!src;
      }
    } catch (_e) {
      /* no IndexedDB (private window) — fall through to the demo */
    }
    if (!restored) setSource(await makeDemo());
  }
  if (R) boot();

  // expose for debugging in the console
  DL.app = {
    state, pipe, view, DEFAULTS, BUILTIN, runExport, runCPU, buildParams, renderStill,
    get src() { return src; },
    get R() { return R; },
    // synchronous frame for tests / headless use
    frame(t = state.time) {
      const s = eff();
      runCPU(s, t);
      target = R.renderImage(buildParams(s, t), 1);
      R.present(target, viewParams());
      updateOverlay();
      return pipe;
    }
  };
})();
