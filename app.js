(() => {
  const $ = (id) => document.getElementById(id);

  const els = {
    fileInput: $("fileInput"),
    resetButton: $("resetButton"),
    statusLine: $("statusLine"),
    compareStage: $("compareStage"),
    processedClip: $("processedClip"),
    compareHandle: $("compareHandle"),
    originalCanvas: $("originalCanvas"),
    processedCanvas: $("processedCanvas"),
    asciiPanel: $("asciiPanel"),
    asciiText: $("asciiText"),

    ditheringType: $("ditheringType"),
    diffusionMap: $("diffusionMap"),
    orderedMatrix: $("orderedMatrix"),
    threshold: $("threshold"),
    noiseAmount: $("noiseAmount"),
    gradientDitherMode: $("gradientDitherMode"),
    temporalDither: $("temporalDither"),
    temporalPhase: $("temporalPhase"),

    foregroundColor: $("foregroundColor"),
    backgroundColor: $("backgroundColor"),
    accentColor: $("accentColor"),
    accentEnabled: $("accentEnabled"),
    paletteSteps: $("paletteSteps"),
    palettePreset: $("palettePreset"),
    customPalette: $("customPalette"),
    paletteEditor: $("paletteEditor"),
    paletteChipList: $("paletteChipList"),
    addPaletteColor: $("addPaletteColor"),

    brightness: $("brightness"),
    contrast: $("contrast"),
    gamma: $("gamma"),
    saturation: $("saturation"),
    hueShift: $("hueShift"),
    pixelSize: $("pixelSize"),
    maxWidth: $("maxWidth"),
    invert: $("invert"),
    exposure: $("exposure"),
    contrastCurve: $("contrastCurve"),
    highlightClip: $("highlightClip"),
    softKnee: $("softKnee"),
    brightnessBias: $("brightnessBias"),
    blackLevel: $("blackLevel"),

    glowEnabled: $("glowEnabled"),
    glowIntensity: $("glowIntensity"),
    glowRadius: $("glowRadius"),
    glowIterations: $("glowIterations"),
    bloomThreshold: $("bloomThreshold"),
    bloomTint: $("bloomTint"),
    bloomHalo: $("bloomHalo"),
    bloomGrain: $("bloomGrain"),

    chromaEnabled: $("chromaEnabled"),
    chromaMode: $("chromaMode"),
    chromaStrength: $("chromaStrength"),
    chromaAngle: $("chromaAngle"),
    chromaBalance: $("chromaBalance"),
    chromaEdgeWeight: $("chromaEdgeWeight"),
    rShift: $("rShift"),
    gShift: $("gShift"),
    bShift: $("bShift"),

    animatePreview: $("animatePreview"),
    shimmerEnabled: $("shimmerEnabled"),
    shimmerNoiseType: $("shimmerNoiseType"),
    shimmerAmount: $("shimmerAmount"),
    shimmerScale: $("shimmerScale"),
    shimmerSpeed: $("shimmerSpeed"),

    waveEnabled: $("waveEnabled"),
    waveFrequency: $("waveFrequency"),
    waveAmplitude: $("waveAmplitude"),
    waveSpeed: $("waveSpeed"),

    exportDuration: $("exportDuration"),
    exportFps: $("exportFps"),
    transparentExport: $("transparentExport"),
    previewBgEnabled: $("previewBgEnabled"),
    previewBgColor: $("previewBgColor"),

    asciiChars: $("asciiChars"),
    asciiCell: $("asciiCell"),

    diffusionField: $("diffusionField"),
    orderedField: $("orderedField"),
    thresholdField: $("thresholdField"),
    noiseField: $("noiseField"),
    asciiOptions: $("asciiOptions"),

    thresholdValue: $("thresholdValue"),
    noiseValue: $("noiseValue"),
    temporalPhaseValue: $("temporalPhaseValue"),
    paletteValue: $("paletteValue"),
    brightnessValue: $("brightnessValue"),
    contrastValue: $("contrastValue"),
    gammaValue: $("gammaValue"),
    saturationValue: $("saturationValue"),
    hueValue: $("hueValue"),
    pixelSizeValue: $("pixelSizeValue"),
    asciiCellValue: $("asciiCellValue"),
    exposureValue: $("exposureValue"),
    contrastCurveValue: $("contrastCurveValue"),
    highlightClipValue: $("highlightClipValue"),
    softKneeValue: $("softKneeValue"),
    brightnessBiasValue: $("brightnessBiasValue"),
    blackLevelValue: $("blackLevelValue"),

    glowIntensityValue: $("glowIntensityValue"),
    glowRadiusValue: $("glowRadiusValue"),
    glowIterationsValue: $("glowIterationsValue"),
    bloomThresholdValue: $("bloomThresholdValue"),
    bloomHaloValue: $("bloomHaloValue"),
    bloomGrainValue: $("bloomGrainValue"),

    chromaStrengthValue: $("chromaStrengthValue"),
    chromaAngleValue: $("chromaAngleValue"),
    chromaBalanceValue: $("chromaBalanceValue"),
    chromaEdgeWeightValue: $("chromaEdgeWeightValue"),
    rShiftValue: $("rShiftValue"),
    gShiftValue: $("gShiftValue"),
    bShiftValue: $("bShiftValue"),

    shimmerAmountValue: $("shimmerAmountValue"),
    shimmerScaleValue: $("shimmerScaleValue"),
    shimmerSpeedValue: $("shimmerSpeedValue"),
    waveFrequencyValue: $("waveFrequencyValue"),
    waveAmplitudeValue: $("waveAmplitudeValue"),
    waveSpeedValue: $("waveSpeedValue"),

    exportDurationValue: $("exportDurationValue"),
    exportFpsValue: $("exportFpsValue"),

    downloadSvg: $("downloadSvg"),
    downloadAnimatedSvg: $("downloadAnimatedSvg"),
    downloadPng: $("downloadPng"),
    downloadWebp: $("downloadWebp"),
    downloadVideo: $("downloadVideo"),
    downloadTxt: $("downloadTxt")
  };

  const originalCtx = els.originalCanvas.getContext("2d");
  const processedCtx = els.processedCanvas.getContext("2d");

  const sourceCanvas = document.createElement("canvas");
  const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const stagedCanvas = document.createElement("canvas");
  const stagedCtx = stagedCanvas.getContext("2d", { willReadFrequently: true });

  const scaledCanvas = document.createElement("canvas");
  const scaledCtx = scaledCanvas.getContext("2d", { willReadFrequently: true });
  const workCanvas = document.createElement("canvas");
  const workCtx = workCanvas.getContext("2d", { willReadFrequently: true });
  const blurCanvas = document.createElement("canvas");
  const blurCtx = blurCanvas.getContext("2d");
  const bloomMaskCanvas = document.createElement("canvas");
  const bloomMaskCtx = bloomMaskCanvas.getContext("2d", { willReadFrequently: true });
  const bloomTempCanvas = document.createElement("canvas");
  const bloomTempCtx = bloomTempCanvas.getContext("2d");

  const exportCanvas = document.createElement("canvas");
  const exportCtx = exportCanvas.getContext("2d", { willReadFrequently: true });

  const DIFFUSION_KERNELS = {
    "floyd-steinberg": { divisor: 16, weights: [[1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]] },
    atkinson: { divisor: 8, weights: [[1, 0, 1], [2, 0, 1], [-1, 1, 1], [0, 1, 1], [1, 1, 1], [0, 2, 1]] },
    jarvis: {
      divisor: 48,
      weights: [[1, 0, 7], [2, 0, 5], [-2, 1, 3], [-1, 1, 5], [0, 1, 7], [1, 1, 5], [2, 1, 3], [-2, 2, 1], [-1, 2, 3], [0, 2, 5], [1, 2, 3], [2, 2, 1]]
    },
    stucki: {
      divisor: 42,
      weights: [[1, 0, 8], [2, 0, 4], [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2], [-2, 2, 1], [-1, 2, 2], [0, 2, 4], [1, 2, 2], [2, 2, 1]]
    }
  };

  const BAYER_4 = [
    0, 8, 2, 10,
    12, 4, 14, 6,
    3, 11, 1, 9,
    15, 7, 13, 5
  ];

  const BAYER_8 = [
    0, 48, 12, 60, 3, 51, 15, 63,
    32, 16, 44, 28, 35, 19, 47, 31,
    8, 56, 4, 52, 11, 59, 7, 55,
    40, 24, 36, 20, 43, 27, 39, 23,
    2, 50, 14, 62, 1, 49, 13, 61,
    34, 18, 46, 30, 33, 17, 45, 29,
    10, 58, 6, 54, 9, 57, 5, 53,
    42, 26, 38, 22, 41, 25, 37, 21
  ];

  const DEFAULTS = {
    ditheringType: "error-diffusion",
    diffusionMap: "floyd-steinberg",
    orderedMatrix: "bayer8",
    threshold: 128,
    noiseAmount: 24,
    gradientDitherMode: "standard",
    temporalDither: false,
    temporalPhase: 0,

    foregroundColor: "#03140f",
    backgroundColor: "#efe8d2",
    accentColor: "#41b6c4",
    accentEnabled: false,
    paletteSteps: 2,
    palettePreset: "custom",
    customPalette: "",

    brightness: 0,
    contrast: 18,
    gamma: 100,
    saturation: 100,
    hueShift: 0,
    pixelSize: 3,
    maxWidth: 1400,
    invert: false,
    exposure: 0,
    contrastCurve: 0,
    highlightClip: 92,
    softKnee: 14,
    brightnessBias: 0,
    blackLevel: 0,

    glowEnabled: true,
    glowIntensity: 45,
    glowRadius: 8,
    glowIterations: 2,
    bloomThreshold: 72,
    bloomTint: "#66d6ff",
    bloomHalo: 18,
    bloomGrain: 8,

    chromaEnabled: false,
    chromaMode: "radial",
    chromaStrength: 20,
    chromaAngle: 0,
    chromaBalance: 100,
    chromaEdgeWeight: 60,
    rShift: 100,
    gShift: 0,
    bShift: -100,

    animatePreview: true,
    shimmerEnabled: false,
    shimmerNoiseType: "blue",
    shimmerAmount: 18,
    shimmerScale: 7,
    shimmerSpeed: 12,

    waveEnabled: false,
    waveFrequency: 18,
    waveAmplitude: 10,
    waveSpeed: 10,

    exportDuration: 5,
    exportFps: 24,
    transparentExport: false,
    previewBgEnabled: true,
    previewBgColor: "#f3f3f1",
    prismaticGlitchAmount: 0,

    asciiChars: " .,:;irsXA253hMHGS#9B&@",
    asciiCell: 4
  };

  const PRESETS = {
    mono: {
      ditheringType: "error-diffusion",
      diffusionMap: "floyd-steinberg",
      foregroundColor: "#0a100d",
      backgroundColor: "#e5dcc1",
      accentEnabled: false,
      paletteSteps: 2,
      contrast: 20,
      pixelSize: 4,
      palettePreset: "custom",
      glowIntensity: 18,
      bloomThreshold: 82,
      glowRadius: 6
    },
    gameboy: {
      ditheringType: "ordered",
      orderedMatrix: "bayer4",
      foregroundColor: "#1d2b1f",
      backgroundColor: "#c7d89b",
      accentColor: "#5a7f4f",
      accentEnabled: true,
      paletteSteps: 4,
      contrast: 14,
      saturation: 80,
      pixelSize: 5,
      palettePreset: "custom",
      glowIntensity: 10
    },
    vapor: {
      ditheringType: "ordered",
      orderedMatrix: "bayer8",
      foregroundColor: "#0f163a",
      backgroundColor: "#ffd3f5",
      accentColor: "#42f5ce",
      accentEnabled: true,
      paletteSteps: 5,
      hueShift: 18,
      saturation: 138,
      pixelSize: 3,
      glowIntensity: 38,
      bloomThreshold: 68
    },
    newspaper: {
      ditheringType: "error-diffusion",
      diffusionMap: "stucki",
      foregroundColor: "#1b1b18",
      backgroundColor: "#f4efe1",
      accentEnabled: false,
      paletteSteps: 2,
      contrast: 24,
      pixelSize: 2,
      glowEnabled: false
    },
    cmyk: {
      ditheringType: "ordered",
      orderedMatrix: "bayer8",
      foregroundColor: "#10123f",
      backgroundColor: "#fff3cd",
      accentColor: "#ed4fb4",
      accentEnabled: true,
      paletteSteps: 6,
      saturation: 160,
      pixelSize: 2,
      glowIntensity: 24,
      bloomThreshold: 70
    },
    hacker: {
      ditheringType: "ascii",
      foregroundColor: "#7bff6d",
      backgroundColor: "#041008",
      accentEnabled: false,
      paletteSteps: 2,
      contrast: 24,
      pixelSize: 2,
      asciiChars: " .`'^,:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
      shimmerEnabled: true,
      shimmerAmount: 22,
      shimmerSpeed: 18,
      waveEnabled: true,
      waveAmplitude: 11,
      glowEnabled: false
    },
    "neon-glow": {
      ditheringType: "error-diffusion",
      diffusionMap: "jarvis",
      gradientDitherMode: "gradient-diffusion",
      palettePreset: "electric-blue",
      paletteSteps: 5,
      contrast: 34,
      exposure: 20,
      contrastCurve: 24,
      glowEnabled: true,
      glowIntensity: 76,
      bloomThreshold: 62,
      glowRadius: 16,
      glowIterations: 4,
      bloomHalo: 26,
      bloomGrain: 12,
      chromaEnabled: true,
      chromaMode: "radial",
      chromaStrength: 24,
      chromaBalance: 120,
      chromaEdgeWeight: 72,
      rShift: 130,
      gShift: 0,
      bShift: -130,
      shimmerEnabled: false,
      shimmerAmount: 0,
      shimmerSpeed: 6,
      waveEnabled: false
    },
    "electric-blue": {
      palettePreset: "electric-blue",
      foregroundColor: "#ffffff",
      accentColor: "#56dfff",
      backgroundColor: "#061634",
      accentEnabled: true,
      paletteSteps: 5,
      glowEnabled: true,
      bloomTint: "#72dcff",
      glowIntensity: 72,
      bloomThreshold: 64,
      glowRadius: 14,
      glowIterations: 4,
      chromaEnabled: true,
      chromaMode: "radial",
      chromaStrength: 20,
      rShift: 120,
      gShift: 0,
      bShift: -120
    },
    "amber-ochre": {
      palettePreset: "amber-ochre",
      foregroundColor: "#fff5d6",
      accentColor: "#d99b2f",
      backgroundColor: "#2d1707",
      accentEnabled: true,
      paletteSteps: 5,
      glowEnabled: true,
      bloomTint: "#ffbe66",
      glowIntensity: 66,
      bloomThreshold: 58,
      glowRadius: 15,
      glowIterations: 4,
      chromaEnabled: true,
      chromaMode: "linear",
      chromaAngle: 8,
      chromaStrength: 12,
      rShift: 80,
      gShift: 0,
      bShift: -70
    },
    "prism-bloom": {
      ditheringType: "ordered",
      orderedMatrix: "bayer8",
      gradientDitherMode: "blue-noise-ordered",
      temporalDither: false,
      temporalPhase: 0,
      palettePreset: "custom",
      customPalette: "#08122f,#0f3e60,#3a7f87,#7c8c99,#b38d4f,#ffffff",
      accentEnabled: false,
      paletteSteps: 6,
      brightness: 4,
      contrast: 26,
      exposure: 26,
      contrastCurve: 22,
      highlightClip: 90,
      softKnee: 18,
      blackLevel: 2,
      glowEnabled: true,
      glowIntensity: 82,
      bloomThreshold: 58,
      glowRadius: 18,
      glowIterations: 5,
      bloomTint: "#7fd6ff",
      bloomHalo: 34,
      bloomGrain: 0,
      chromaEnabled: true,
      chromaMode: "radial",
      chromaStrength: 28,
      chromaBalance: 120,
      chromaEdgeWeight: 74,
      rShift: 135,
      gShift: 8,
      bShift: -128,
      pixelSize: 2,
      shimmerEnabled: false,
      waveEnabled: false
    },
    "inferno-halftone": {
      ditheringType: "ordered",
      orderedMatrix: "bayer4",
      gradientDitherMode: "standard",
      temporalDither: false,
      temporalPhase: 0,
      palettePreset: "custom",
      customPalette: "#060202,#2a0b08,#7c1410,#d13a16,#f98f1f,#ffe47a",
      accentEnabled: false,
      paletteSteps: 6,
      brightness: -2,
      contrast: 34,
      saturation: 140,
      exposure: 20,
      contrastCurve: 28,
      highlightClip: 88,
      softKnee: 12,
      blackLevel: 4,
      glowEnabled: true,
      glowIntensity: 88,
      bloomThreshold: 54,
      glowRadius: 16,
      glowIterations: 5,
      bloomTint: "#ff9a2e",
      bloomHalo: 42,
      bloomGrain: 0,
      chromaEnabled: true,
      chromaMode: "linear",
      chromaAngle: 6,
      chromaStrength: 17,
      chromaBalance: 108,
      chromaEdgeWeight: 66,
      rShift: 82,
      gShift: 2,
      bShift: -62,
      pixelSize: 4,
      shimmerEnabled: false,
      waveEnabled: false
    },
    "vintage-phosphor": {
      ditheringType: "error-diffusion",
      diffusionMap: "stucki",
      gradientDitherMode: "gradient-diffusion",
      temporalDither: false,
      temporalPhase: 0,
      palettePreset: "custom",
      customPalette: "#111915,#365442,#70825c,#c7c58c,#f1e8cf",
      accentEnabled: false,
      paletteSteps: 5,
      brightness: 2,
      contrast: 18,
      saturation: 84,
      exposure: 10,
      contrastCurve: 8,
      highlightClip: 93,
      softKnee: 22,
      blackLevel: 1,
      glowEnabled: true,
      glowIntensity: 46,
      bloomThreshold: 68,
      glowRadius: 11,
      glowIterations: 3,
      bloomTint: "#ffc78d",
      bloomHalo: 16,
      bloomGrain: 0,
      chromaEnabled: true,
      chromaMode: "radial",
      chromaStrength: 8,
      chromaBalance: 90,
      chromaEdgeWeight: 40,
      rShift: 34,
      gShift: 2,
      bShift: -22,
      pixelSize: 2,
      shimmerEnabled: false,
      waveEnabled: false
    },
    "prismatic-glitch-gradient": {
      ditheringType: "ordered",
      orderedMatrix: "bayer8",
      gradientDitherMode: "blue-noise-ordered",
      temporalDither: true,
      temporalPhase: 17,
      palettePreset: "custom",
      customPalette: "#070a1c,#22295f,#7b4ee7,#f447ac,#ffffff",
      accentEnabled: false,
      paletteSteps: 6,
      brightness: 4,
      contrast: 30,
      saturation: 132,
      exposure: 28,
      contrastCurve: 30,
      highlightClip: 86,
      softKnee: 18,
      blackLevel: 2,
      glowEnabled: true,
      glowIntensity: 92,
      bloomThreshold: 48,
      glowRadius: 17,
      glowIterations: 5,
      bloomTint: "#ffa6f0",
      bloomHalo: 44,
      bloomGrain: 0,
      chromaEnabled: true,
      chromaMode: "linear",
      chromaAngle: -12,
      chromaStrength: 32,
      chromaBalance: 135,
      chromaEdgeWeight: 74,
      rShift: 155,
      gShift: 12,
      bShift: -146,
      prismaticGlitchAmount: 58,
      pixelSize: 2,
      shimmerEnabled: false,
      waveEnabled: false
    },
    shimmer: {
      ditheringType: "ascii",
      foregroundColor: "#f4ecc6",
      backgroundColor: "#090c14",
      accentEnabled: false,
      paletteSteps: 2,
      contrast: 22,
      pixelSize: 3,
      shimmerEnabled: true,
      shimmerNoiseType: "blue",
      shimmerAmount: 26,
      shimmerScale: 8,
      shimmerSpeed: 16,
      waveEnabled: true,
      waveFrequency: 14,
      waveAmplitude: 14,
      waveSpeed: 11,
      glowEnabled: true,
      glowIntensity: 36,
      bloomThreshold: 70
    }
  };

  let compareRatio = 0.5;
  let processTimer = null;
  let processing = false;
  let pendingProcess = false;
  let sourceImage = null;
  let sourceKind = "image";
  let sourceVideo = null;
  let sourceGif = null;
  let sourceClockStartSec = 0;
  let lastSourceFrameToken = "";
  let sourceLoadToken = 0;
  let currentObjectUrl = null;
  let lastResult = null;
  let currentSettings = null;
  let customPaletteColors = [];
  let activePresetName = "custom";
  let needsFrame = true;
  let exportBusy = false;

  function init() {
    bindEvents();
    applyDefaults();
    updateControlVisibility();
    updateReadouts();
    setCompareRatio(0.5);
    startAnimationLoop();
    createDemoImage();
  }

  function bindEvents() {
    const reprocessControlIds = new Set([
      "ditheringType",
      "diffusionMap",
      "orderedMatrix",
      "threshold",
      "noiseAmount",
      "gradientDitherMode",
      "temporalDither",
      "temporalPhase",
      "palettePreset",
      "customPalette",
      "foregroundColor",
      "backgroundColor",
      "accentColor",
      "accentEnabled",
      "paletteSteps",
      "brightness",
      "contrast",
      "gamma",
      "saturation",
      "hueShift",
      "pixelSize",
      "maxWidth",
      "invert",
      "exposure",
      "contrastCurve",
      "highlightClip",
      "softKnee",
      "brightnessBias",
      "blackLevel",
      "transparentExport",
      "asciiChars",
      "asciiCell"
    ]);

    els.fileInput.addEventListener("change", onUpload);
    els.resetButton.addEventListener("click", () => {
      applyDefaults();
      scheduleProcess();
    });

    document.querySelectorAll(".controls input, .controls select").forEach((input) => {
      const evt = input.type === "number" ? "change" : "input";
      input.addEventListener(evt, () => {
        updateControlVisibility();
        updateReadouts();
        if (reprocessControlIds.has(input.id)) {
          scheduleProcess();
        } else {
          currentSettings = getSettings();
        }
        markFrameDirty();
      });
      if (evt !== "change") {
        input.addEventListener("change", () => {
          updateReadouts();
          if (reprocessControlIds.has(input.id)) {
            scheduleProcess();
          } else {
            currentSettings = getSettings();
          }
          markFrameDirty();
        });
      }
    });

    document.querySelectorAll(".preset").forEach((btn) => {
      btn.addEventListener("click", () => {
        applyPreset(btn.dataset.preset);
      });
    });

    if (els.palettePreset) {
      els.palettePreset.addEventListener("change", () => {
        applyPalettePreset(els.palettePreset.value);
        if (els.palettePreset.value === "custom") {
          activePresetName = "custom";
        }
        syncPaletteEditorFromInput(true);
        updateReadouts();
        scheduleProcess();
        markFrameDirty();
      });
    }

    if (els.customPalette) {
      els.customPalette.addEventListener("input", () => {
        if (els.palettePreset.value === "custom") {
          syncPaletteEditorFromInput(false);
        }
      });
      els.customPalette.addEventListener("change", () => {
        if (els.palettePreset.value === "custom") {
          syncPaletteEditorFromInput(true);
        }
      });
    }

    if (els.addPaletteColor) {
      els.addPaletteColor.addEventListener("click", () => {
        if (els.palettePreset.value !== "custom") return;
        if (!customPaletteColors.length) {
          customPaletteColors = ["#222222", "#ffffff"];
        }
        const last = customPaletteColors[customPaletteColors.length - 1] || "#ffffff";
        customPaletteColors.push(last);
        commitPaletteEditor();
      });
    }

    els.downloadSvg.addEventListener("click", downloadSvg);
    els.downloadAnimatedSvg.addEventListener("click", downloadAnimatedSvg);
    els.downloadPng.addEventListener("click", () => downloadCanvas("png"));
    els.downloadWebp.addEventListener("click", () => downloadCanvas("webp"));
    els.downloadVideo.addEventListener("click", downloadVideo);
    els.downloadTxt.addEventListener("click", downloadAsciiText);

    bindCompareDrag();
  }

  function applyDefaults() {
    activePresetName = "custom";
    Object.entries(DEFAULTS).forEach(([key, value]) => {
      const el = els[key];
      if (!el) return;
      if (el.type === "checkbox") {
        el.checked = Boolean(value);
      } else {
        el.value = String(value);
      }
    });
    syncPaletteEditorFromInput(true);
    updateControlVisibility();
    updateReadouts();
    markFrameDirty();
  }

  function applyPreset(name) {
    const preset = PRESETS[name];
    if (!preset) return;
    activePresetName = name;
    Object.entries(preset).forEach(([key, value]) => {
      const el = els[key];
      if (!el) return;
      if (el.type === "checkbox") {
        el.checked = Boolean(value);
      } else {
        el.value = String(value);
      }
    });
    if (preset.palettePreset && preset.palettePreset !== "custom") {
      applyPalettePreset(preset.palettePreset);
    }
    syncPaletteEditorFromInput(true);
    updateControlVisibility();
    updateReadouts();
    scheduleProcess();
    markFrameDirty();
  }

  function applyPalettePreset(presetName) {
    if (!presetName || presetName === "custom") return;

    const map = {
      "electric-blue": {
        foregroundColor: "#ffffff",
        accentColor: "#5bdeff",
        backgroundColor: "#08152f",
        accentEnabled: true,
        paletteSteps: 5
      },
      "amber-ochre": {
        foregroundColor: "#fff5d7",
        accentColor: "#cf8e2d",
        backgroundColor: "#2b1707",
        accentEnabled: true,
        paletteSteps: 5
      }
    };

    const palette = map[presetName];
    if (!palette) return;
    Object.entries(palette).forEach(([key, value]) => {
      const el = els[key];
      if (!el) return;
      if (el.type === "checkbox") {
        el.checked = Boolean(value);
      } else {
        el.value = String(value);
      }
    });
    if (els.customPalette) {
      els.customPalette.value = "";
    }
    customPaletteColors = [];
    renderPaletteEditor();
  }

  function syncPaletteEditorFromInput(triggerRender) {
    if (!els.customPalette) return;
    if (els.palettePreset.value !== "custom") {
      customPaletteColors = [];
      renderPaletteEditor();
      return;
    }
    const parsed = parseCustomPalette(els.customPalette.value).map(rgbToHex);
    if (parsed.length >= 2) {
      customPaletteColors = parsed;
    } else if (!customPaletteColors.length) {
      customPaletteColors = [els.backgroundColor.value, els.accentColor.value, els.foregroundColor.value];
    }
    if (triggerRender) {
      renderPaletteEditor();
    }
  }

  function commitPaletteEditor() {
    if (els.palettePreset.value !== "custom") return;
    if (customPaletteColors.length < 2) {
      customPaletteColors = [els.backgroundColor.value, els.foregroundColor.value];
    }
    els.customPalette.value = customPaletteColors.join(",");
    renderPaletteEditor();
    scheduleProcess();
    markFrameDirty();
  }

  function renderPaletteEditor() {
    if (!els.paletteChipList) return;
    els.paletteChipList.innerHTML = "";
    const isCustom = els.palettePreset.value === "custom";
    const palette = isCustom ? customPaletteColors : [];

    if (!palette.length) {
      const info = document.createElement("div");
      info.className = "palette-chip-label";
      info.textContent = isCustom ? "Add at least two colors." : "Switch to Custom preset to edit.";
      els.paletteChipList.appendChild(info);
      if (els.addPaletteColor) {
        els.addPaletteColor.disabled = !isCustom;
      }
      return;
    }

    palette.forEach((color, index) => {
      const row = document.createElement("div");
      row.className = "palette-chip";

      const picker = document.createElement("input");
      picker.type = "color";
      picker.value = normalizeHex(color);
      picker.disabled = !isCustom;
      picker.addEventListener("input", (event) => {
        customPaletteColors[index] = event.target.value;
        commitPaletteEditor();
      });

      const label = document.createElement("span");
      label.className = "palette-chip-label";
      label.textContent = normalizeHex(color);

      const leftBtn = document.createElement("button");
      leftBtn.type = "button";
      leftBtn.className = "palette-chip-btn";
      leftBtn.textContent = "←";
      leftBtn.disabled = !isCustom || index === 0;
      leftBtn.addEventListener("click", () => {
        if (index <= 0) return;
        const temp = customPaletteColors[index - 1];
        customPaletteColors[index - 1] = customPaletteColors[index];
        customPaletteColors[index] = temp;
        commitPaletteEditor();
      });

      const rightBtn = document.createElement("button");
      rightBtn.type = "button";
      rightBtn.className = "palette-chip-btn";
      rightBtn.textContent = "→";
      rightBtn.disabled = !isCustom || index === palette.length - 1;
      rightBtn.addEventListener("click", () => {
        if (index >= customPaletteColors.length - 1) return;
        const temp = customPaletteColors[index + 1];
        customPaletteColors[index + 1] = customPaletteColors[index];
        customPaletteColors[index] = temp;
        commitPaletteEditor();
      });

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "palette-chip-btn";
      removeBtn.textContent = "×";
      removeBtn.disabled = !isCustom || customPaletteColors.length <= 2;
      removeBtn.addEventListener("click", () => {
        if (customPaletteColors.length <= 2) return;
        customPaletteColors.splice(index, 1);
        commitPaletteEditor();
      });

      row.appendChild(picker);
      row.appendChild(label);
      row.appendChild(leftBtn);
      row.appendChild(rightBtn);
      row.appendChild(removeBtn);
      els.paletteChipList.appendChild(row);
    });

    if (els.addPaletteColor) {
      els.addPaletteColor.disabled = !isCustom;
    }
  }

  function updateReadouts() {
    els.thresholdValue.textContent = els.threshold.value;
    els.noiseValue.textContent = els.noiseAmount.value;
    els.temporalPhaseValue.textContent = els.temporalPhase.value;
    els.paletteValue.textContent = els.paletteSteps.value;
    els.brightnessValue.textContent = els.brightness.value;
    els.contrastValue.textContent = els.contrast.value;
    els.gammaValue.textContent = (Number(els.gamma.value) / 100).toFixed(2);
    els.saturationValue.textContent = `${els.saturation.value}%`;
    els.hueValue.textContent = `${els.hueShift.value}°`;
    els.pixelSizeValue.textContent = `${els.pixelSize.value}x`;
    els.asciiCellValue.textContent = els.asciiCell.value;
    els.exposureValue.textContent = (Number(els.exposure.value) / 100).toFixed(2);
    els.contrastCurveValue.textContent = els.contrastCurve.value;
    els.highlightClipValue.textContent = (Number(els.highlightClip.value) / 100).toFixed(2);
    els.softKneeValue.textContent = (Number(els.softKnee.value) / 100).toFixed(2);
    els.brightnessBiasValue.textContent = (Number(els.brightnessBias.value) / 100).toFixed(2);
    els.blackLevelValue.textContent = (Number(els.blackLevel.value) / 100).toFixed(2);

    els.glowIntensityValue.textContent = `${els.glowIntensity.value}%`;
    els.glowRadiusValue.textContent = `${els.glowRadius.value}px`;
    els.glowIterationsValue.textContent = els.glowIterations.value;
    els.bloomThresholdValue.textContent = (Number(els.bloomThreshold.value) / 100).toFixed(2);
    els.bloomHaloValue.textContent = `${els.bloomHalo.value}%`;
    els.bloomGrainValue.textContent = `${els.bloomGrain.value}%`;

    els.chromaStrengthValue.textContent = (Number(els.chromaStrength.value) / 10).toFixed(1);
    els.chromaAngleValue.textContent = `${els.chromaAngle.value}°`;
    els.chromaBalanceValue.textContent = (Number(els.chromaBalance.value) / 100).toFixed(2);
    els.chromaEdgeWeightValue.textContent = (Number(els.chromaEdgeWeight.value) / 100).toFixed(2);
    els.rShiftValue.textContent = (Number(els.rShift.value) / 100).toFixed(2);
    els.gShiftValue.textContent = (Number(els.gShift.value) / 100).toFixed(2);
    els.bShiftValue.textContent = (Number(els.bShift.value) / 100).toFixed(2);

    els.shimmerAmountValue.textContent = `${els.shimmerAmount.value}%`;
    els.shimmerScaleValue.textContent = els.shimmerScale.value;
    els.shimmerSpeedValue.textContent = (Number(els.shimmerSpeed.value) / 10).toFixed(1);
    els.waveFrequencyValue.textContent = (Number(els.waveFrequency.value) / 10).toFixed(1);
    els.waveAmplitudeValue.textContent = `${els.waveAmplitude.value}%`;
    els.waveSpeedValue.textContent = (Number(els.waveSpeed.value) / 10).toFixed(1);

    els.exportDurationValue.textContent = els.exportDuration.value;
    els.exportFpsValue.textContent = els.exportFps.value;
  }

  function updateControlVisibility() {
    const type = els.ditheringType.value;
    els.diffusionField.classList.toggle("hidden", type !== "error-diffusion");
    els.orderedField.classList.toggle("hidden", type !== "ordered");
    els.thresholdField.classList.toggle("hidden", type !== "threshold");
    els.noiseField.classList.toggle("hidden", type !== "noise");
    els.asciiOptions.classList.toggle("hidden", type !== "ascii");
    els.asciiPanel.classList.toggle("hidden", type !== "ascii");
    els.downloadTxt.disabled = type !== "ascii";
    if (els.customPalette) {
      els.customPalette.disabled = els.palettePreset.value !== "custom";
    }
  }

  async function onUpload() {
    const file = els.fileInput.files && els.fileInput.files[0];
    if (!file) return;

    sourceLoadToken += 1;
    const loadToken = sourceLoadToken;
    cleanupActiveSource();
    currentObjectUrl = URL.createObjectURL(file);
    els.statusLine.textContent = `Loading ${file.name}...`;

    try {
      const kind = detectUploadKind(file);
      if (kind === "video") {
        await loadVideoSource(file, loadToken);
      } else if (kind === "gif") {
        await loadGifSource(file, loadToken);
      } else if (kind === "svg") {
        await loadSvgSource(file, loadToken);
      } else {
        await loadImageSource(file, loadToken, { kind: "image" });
      }
    } catch (err) {
      if (loadToken !== sourceLoadToken) return;
      cleanupActiveSource();
      els.statusLine.textContent = `Could not read this file (${err && err.message ? err.message : "unknown error"}).`;
    }
  }

  function detectUploadKind(file) {
    const type = (file.type || "").toLowerCase();
    const name = (file.name || "").toLowerCase();
    if (type.startsWith("video/") || name.endsWith(".mp4") || name.endsWith(".webm")) {
      return "video";
    }
    if (type === "image/gif" || name.endsWith(".gif")) {
      return "gif";
    }
    if (type === "image/svg+xml" || name.endsWith(".svg")) {
      return "svg";
    }
    return "image";
  }

  function cleanupActiveSource() {
    if (processTimer) {
      clearTimeout(processTimer);
      processTimer = null;
    }
    pendingProcess = false;

    if (sourceVideo) {
      sourceVideo.pause();
      sourceVideo.removeAttribute("src");
      sourceVideo.load();
    }
    sourceVideo = null;

    if (sourceGif && sourceGif.frames) {
      sourceGif.frames.forEach((frame) => {
        if (frame.bitmap && typeof frame.bitmap.close === "function") {
          frame.bitmap.close();
        }
      });
    }
    sourceGif = null;

    sourceImage = null;
    sourceKind = "image";
    sourceClockStartSec = 0;
    lastSourceFrameToken = "";

    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
  }

  function loadImageSource(file, loadToken, options = {}) {
    const kind = options.kind || "image";
    const keepObjectUrl = Boolean(options.keepObjectUrl);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        if (loadToken !== sourceLoadToken) {
          resolve();
          return;
        }
        sourceKind = kind;
        sourceVideo = null;
        sourceGif = null;
        sourceImage = img;
        sourceClockStartSec = performance.now() / 1000;
        lastSourceFrameToken = "";
        scheduleProcess();
        els.statusLine.textContent = `Loaded ${file.name}. Processing...`;
        if (!keepObjectUrl && currentObjectUrl) {
          URL.revokeObjectURL(currentObjectUrl);
          currentObjectUrl = null;
        }
        resolve();
      };
      img.onerror = () => {
        reject(new Error("image decode failed"));
      };
      img.src = currentObjectUrl;
    });
  }

  function loadVideoSource(file, loadToken) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";

      const onError = () => {
        cleanup();
        reject(new Error("video decode failed"));
      };
      const onReady = async () => {
        cleanup();
        if (loadToken !== sourceLoadToken) {
          resolve();
          return;
        }
        sourceKind = "video";
        sourceVideo = video;
        sourceGif = null;
        sourceImage = video;
        sourceClockStartSec = performance.now() / 1000;
        lastSourceFrameToken = "";
        try {
          await video.play();
        } catch (_err) {
          // Playback can still proceed when user starts interaction later.
        }
        scheduleProcess();
        const durationLabel = Number.isFinite(video.duration) && video.duration > 0
          ? `${video.duration.toFixed(2)}s`
          : "unknown duration";
        els.statusLine.textContent = `Loaded ${file.name} (${video.videoWidth}x${video.videoHeight}, ${durationLabel}).`;
        resolve();
      };
      const cleanup = () => {
        video.removeEventListener("loadeddata", onReady);
        video.removeEventListener("error", onError);
      };

      video.addEventListener("loadeddata", onReady);
      video.addEventListener("error", onError);
      video.src = currentObjectUrl;
      video.load();
    });
  }

  async function loadGifSource(file, loadToken) {
    const canDecodeGif = (typeof ImageDecoder !== "undefined")
      && (typeof ImageDecoder.isTypeSupported === "function")
      && await ImageDecoder.isTypeSupported("image/gif").catch(() => false);

    if (!canDecodeGif) {
      await loadImageSource(file, loadToken, { kind: "image" });
      if (loadToken === sourceLoadToken) {
        els.statusLine.textContent = `Loaded ${file.name} as a static frame (animated GIF decoding not supported in this browser).`;
      }
      return;
    }

    const bytes = await file.arrayBuffer();
    if (loadToken !== sourceLoadToken) return;

    const decoder = new ImageDecoder({ data: bytes, type: "image/gif" });
    const track = decoder.tracks && decoder.tracks.selectedTrack;
    const frameCount = Math.max(1, (track && track.frameCount) || 1);
    const maxFrames = Math.min(frameCount, 360);
    const frames = [];
    const timelineMs = [];
    let totalDurationMs = 0;

    try {
      for (let i = 0; i < maxFrames; i++) {
        const decoded = await decoder.decode({ frameIndex: i });
        if (loadToken !== sourceLoadToken) {
          if (decoded.image && typeof decoded.image.close === "function") {
            decoded.image.close();
          }
          frames.forEach((frame) => {
            if (frame.bitmap && typeof frame.bitmap.close === "function") {
              frame.bitmap.close();
            }
          });
          return;
        }
        const durationMs = Math.max(20, (decoded.duration || 100000) / 1000);
        frames.push({ bitmap: decoded.image, durationMs });
        totalDurationMs += durationMs;
        timelineMs.push(totalDurationMs);
      }
    } finally {
      decoder.close();
    }

    if (!frames.length) {
      throw new Error("no GIF frames decoded");
    }

    sourceKind = "gif";
    sourceVideo = null;
    sourceGif = {
      frames,
      timelineMs,
      totalDurationMs: Math.max(20, totalDurationMs)
    };
    sourceImage = frames[0].bitmap;
    sourceClockStartSec = performance.now() / 1000;
    lastSourceFrameToken = "";
    scheduleProcess();
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }

    const cappedLabel = frameCount > maxFrames ? ` (decoded ${maxFrames}/${frameCount} frames)` : "";
    els.statusLine.textContent = `Loaded ${file.name} (${frames.length} animated frames${cappedLabel}).`;
  }

  async function loadSvgSource(file, loadToken) {
    let animated = false;
    try {
      const svgText = await file.text();
      animated = /<\s*animate(?:Transform|Motion)?\b|<\s*set\b|@keyframes|animation\s*:/i.test(svgText);
    } catch (_err) {
      animated = false;
    }
    await loadImageSource(file, loadToken, {
      kind: animated ? "svg-animated" : "image",
      keepObjectUrl: animated
    });
    if (loadToken !== sourceLoadToken) return;
    if (animated) {
      els.statusLine.textContent = `Loaded ${file.name} (animated SVG, frame capture mode).`;
    }
  }

  function bindCompareDrag() {
    let dragging = false;
    const step = 0.01;

    const updateFromEvent = (event) => {
      const rect = els.compareStage.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = (event.clientX - rect.left) / rect.width;
      setCompareRatio(ratio);
    };

    const start = (event) => {
      dragging = true;
      updateFromEvent(event);
      els.compareStage.setPointerCapture(event.pointerId);
    };

    const move = (event) => {
      if (!dragging) return;
      updateFromEvent(event);
    };

    const end = (event) => {
      if (!dragging) return;
      dragging = false;
      try {
        els.compareStage.releasePointerCapture(event.pointerId);
      } catch (_err) {
        // Ignore pointer capture release errors.
      }
    };

    els.compareStage.addEventListener("pointerdown", start);
    els.compareStage.addEventListener("pointermove", move);
    els.compareStage.addEventListener("pointerup", end);
    els.compareStage.addEventListener("pointercancel", end);

    els.compareHandle.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setCompareRatio(compareRatio - step);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setCompareRatio(compareRatio + step);
      } else if (event.key === "Home") {
        event.preventDefault();
        setCompareRatio(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setCompareRatio(1);
      }
    });
  }

  function setCompareRatio(ratio) {
    compareRatio = clamp(ratio, 0, 1);
    const pctValue = compareRatio * 100;
    const pct = `${pctValue.toFixed(2)}%`;
    els.compareStage.style.setProperty("--split", pct);
    els.compareHandle.setAttribute("aria-valuenow", pctValue.toFixed(1));
  }

  function markFrameDirty() {
    needsFrame = true;
  }

  function hasSource() {
    return Boolean(sourceImage || sourceVideo || (sourceGif && sourceGif.frames && sourceGif.frames.length));
  }

  function getActiveDrawable() {
    if (sourceKind === "video") {
      if (sourceVideo && sourceVideo.readyState >= 2) {
        return sourceVideo;
      }
      return null;
    }
    return sourceImage;
  }

  function getDrawableSize(drawable) {
    if (!drawable) return { width: 0, height: 0 };
    return {
      width: drawable.videoWidth || drawable.naturalWidth || drawable.width || 0,
      height: drawable.videoHeight || drawable.naturalHeight || drawable.height || 0
    };
  }

  function scheduleProcess() {
    if (!hasSource()) return;
    if (processTimer) {
      clearTimeout(processTimer);
    }

    processTimer = setTimeout(() => {
      processTimer = null;
      if (processing) {
        pendingProcess = true;
        return;
      }
      processImage();
    }, 16);
  }

  function processImage(options = {}) {
    const drawable = options.drawable || getActiveDrawable();
    if (!drawable) return;

    processing = true;
    const startedAt = performance.now();

    const settings = options.settingsOverride ? { ...options.settingsOverride } : getSettings();
    const srcSize = getDrawableSize(drawable);
    const srcW = srcSize.width;
    const srcH = srcSize.height;

    if (!srcW || !srcH) {
      processing = false;
      return;
    }

    const targetW = Math.max(1, Math.round(Math.min(settings.maxWidth, srcW)));
    const targetH = Math.max(1, Math.round((targetW * srcH) / srcW));

    const cellSize = Math.max(1, settings.pixelSize);
    const cellsW = Math.max(1, Math.floor(targetW / cellSize));
    const cellsH = Math.max(1, Math.floor(targetH / cellSize));

    sourceCanvas.width = cellsW;
    sourceCanvas.height = cellsH;
    sourceCtx.clearRect(0, 0, cellsW, cellsH);
    sourceCtx.drawImage(drawable, 0, 0, cellsW, cellsH);

    const imageData = sourceCtx.getImageData(0, 0, cellsW, cellsH);
    const prep = preprocessImageData(imageData.data, settings, cellsW, cellsH);
    const luminance = prep.luminance;
    const alphaMask = prep.alpha;
    const palette = buildPalette(settings);

    let indices;
    let asciiData = null;

    if (settings.ditheringType === "ascii") {
      asciiData = buildAsciiData(luminance, cellsW, cellsH, settings, palette.length);
      drawAsciiCanvas(asciiData, palette, settings, cellsW, cellsH, alphaMask);
      els.asciiText.textContent = asciiData.lines.join("\n");
    } else {
      indices = ditherLuminance(luminance, cellsW, cellsH, settings, palette.length);
      drawIndexedCanvas(indices, palette, cellsW, cellsH, alphaMask, settings);
      els.asciiText.textContent = "";
    }

    drawBaseCanvases(drawable, targetW, targetH, settings, options.updatePreview !== false);

    const elapsed = performance.now() - startedAt;
    if (!options.skipStatus) {
      const dynamicSource = sourceKind === "video" || sourceKind === "gif" || sourceKind === "svg-animated";
      const animateFlag = (hasAnimatedEffects(settings) || dynamicSource) ? "animated" : "static";
      els.statusLine.textContent = `${srcW}x${srcH} -> ${targetW}x${targetH} | grid ${cellsW}x${cellsH} | ${settings.ditheringType} | ${animateFlag} | ${elapsed.toFixed(1)} ms`;
    }

    lastResult = {
      type: settings.ditheringType,
      palette,
      indices,
      asciiData,
      cellsW,
      cellsH,
      pixelSize: cellSize,
      width: targetW,
      height: targetH,
      alphaMask,
      foregroundColor: settings.foregroundColor,
      backgroundColor: settings.backgroundColor,
      settings: { ...settings }
    };
    currentSettings = { ...settings };

    markFrameDirty();
    const frameTimeSec = Number.isFinite(options.timeSec) ? options.timeSec : (performance.now() / 1000);
    const targetContext = options.targetCtx || processedCtx;
    renderProcessedAtTime(frameTimeSec, true, targetContext, targetW, targetH);

    processing = false;

    if (pendingProcess) {
      pendingProcess = false;
      scheduleProcess();
    }
  }

  function drawBaseCanvases(source, width, height, settings, updatePreview = true) {
    if (updatePreview) {
      els.compareStage.style.setProperty("--aspect", `${width} / ${height}`);
      ensureCanvasSize(els.originalCanvas, width, height);
      ensureCanvasSize(els.processedCanvas, width, height);
    }
    ensureCanvasSize(scaledCanvas, width, height);

    if (updatePreview) {
      originalCtx.imageSmoothingEnabled = true;
      originalCtx.clearRect(0, 0, width, height);
      if (settings.previewBgEnabled) {
        originalCtx.fillStyle = settings.previewBgColor;
        originalCtx.fillRect(0, 0, width, height);
      }
      originalCtx.drawImage(source, 0, 0, width, height);
    }

    scaledCtx.clearRect(0, 0, width, height);
    if (settings.previewBgEnabled) {
      scaledCtx.fillStyle = settings.previewBgColor;
      scaledCtx.fillRect(0, 0, width, height);
    }
    scaledCtx.imageSmoothingEnabled = settings.ditheringType === "ascii";
    if (settings.ditheringType !== "ascii") {
      scaledCtx.imageSmoothingEnabled = false;
    }
    scaledCtx.drawImage(stagedCanvas, 0, 0, width, height);
  }

  function startAnimationLoop() {
    const tick = (ts) => {
      updateDynamicSourceFrame(ts / 1000);
      if (lastResult && currentSettings) {
        const nowSec = ts / 1000;
        const animated = hasAnimatedEffects(currentSettings);

        if (animated && currentSettings.animatePreview) {
          renderProcessedAtTime(nowSec, true);
        } else if (needsFrame) {
          renderProcessedAtTime(nowSec, true);
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function updateDynamicSourceFrame(nowSec) {
    if (processing || exportBusy) return;

    if (sourceKind === "video" && sourceVideo && sourceVideo.readyState >= 2) {
      const token = `v:${Math.floor(sourceVideo.currentTime * 120)}`;
      if (token !== lastSourceFrameToken) {
        lastSourceFrameToken = token;
        sourceImage = sourceVideo;
        processImage({ timeSec: nowSec, skipStatus: true });
      }
      return;
    }

    if (sourceKind === "gif" && sourceGif && sourceGif.frames && sourceGif.frames.length) {
      const elapsedMs = Math.max(0, (nowSec - sourceClockStartSec) * 1000);
      const durationMs = Math.max(20, sourceGif.totalDurationMs || 20);
      const localMs = elapsedMs % durationMs;
      const frameIdx = findTimelineFrameIndex(localMs, sourceGif.timelineMs);
      const token = `g:${frameIdx}`;
      if (token !== lastSourceFrameToken) {
        lastSourceFrameToken = token;
        sourceImage = sourceGif.frames[frameIdx].bitmap;
        processImage({ timeSec: nowSec, skipStatus: true });
      }
      return;
    }

    if (sourceKind === "svg-animated" && sourceImage) {
      const token = `s:${Math.floor(nowSec * 18)}`;
      if (token !== lastSourceFrameToken) {
        lastSourceFrameToken = token;
        processImage({ timeSec: nowSec, skipStatus: true });
      }
    }
  }

  function renderProcessedAtTime(timeSec, force = false, targetCtx = processedCtx, width = els.processedCanvas.width, height = els.processedCanvas.height) {
    if (!lastResult || !currentSettings) return;

    const settings = currentSettings;
    const animated = hasAnimatedEffects(settings);
    if (!force && (!animated || !settings.animatePreview) && !needsFrame) {
      return;
    }

    ensureCanvasSize(workCanvas, width, height);
    ensureCanvasSize(blurCanvas, width, height);

    workCtx.clearRect(0, 0, width, height);
    workCtx.imageSmoothingEnabled = settings.ditheringType === "ascii";
    if (settings.ditheringType !== "ascii") {
      workCtx.imageSmoothingEnabled = false;
    }
    workCtx.drawImage(scaledCanvas, 0, 0, width, height);

    if (settings.waveEnabled && settings.waveAmplitude > 0) {
      applyWaveWarp(workCtx, width, height, timeSec, settings);
    }

    if (settings.shimmerEnabled && settings.shimmerAmount > 0) {
      applyShimmerOverlay(workCtx, width, height, timeSec, settings);
    }

    const applyHeavyFx = (!animated || (width * height < 900000) || ((Math.floor(timeSec * 40) % 3) !== 0));

    if (applyHeavyFx && settings.chromaEnabled && (settings.rShift !== 0 || settings.gShift !== 0 || settings.bShift !== 0)) {
      applyChromaticAberrationAdvanced(workCtx, width, height, settings);
    }

    if (applyHeavyFx && settings.glowEnabled && settings.glowIntensity > 0 && settings.glowRadius > 0) {
      applyHighlightBloom(workCtx, width, height, settings);
    }

    if (settings.prismaticGlitchAmount > 0) {
      applyPrismaticGlitchPass(workCtx, width, height, timeSec, settings);
    }

    targetCtx.clearRect(0, 0, width, height);
    if (settings.previewBgEnabled) {
      targetCtx.fillStyle = settings.previewBgColor;
      targetCtx.fillRect(0, 0, width, height);
    }
    targetCtx.imageSmoothingEnabled = settings.ditheringType === "ascii";
    targetCtx.drawImage(workCanvas, 0, 0, width, height);
    needsFrame = false;
  }

  function getSettings() {
    return {
      ditheringType: els.ditheringType.value,
      diffusionMap: els.diffusionMap.value,
      orderedMatrix: els.orderedMatrix.value,
      threshold: clamp(toInt(els.threshold.value, 128), 0, 255),
      noiseAmount: clamp(toInt(els.noiseAmount.value, 24), 0, 80),
      gradientDitherMode: els.gradientDitherMode.value,
      temporalDither: els.temporalDither.checked,
      temporalPhase: clamp(toInt(els.temporalPhase.value, 0), 0, 63),

      foregroundColor: els.foregroundColor.value,
      backgroundColor: els.backgroundColor.value,
      accentColor: els.accentColor.value,
      accentEnabled: els.accentEnabled.checked,
      paletteSteps: clamp(toInt(els.paletteSteps.value, 2), 2, 8),
      palettePreset: els.palettePreset.value,
      customPalette: (els.customPalette.value || "").trim(),

      brightness: clamp(toInt(els.brightness.value, 0), -100, 100),
      contrast: clamp(toInt(els.contrast.value, 0), -100, 100),
      gamma: clamp(toInt(els.gamma.value, 100), 50, 250) / 100,
      saturation: clamp(toInt(els.saturation.value, 100), 0, 200),
      hueShift: clamp(toInt(els.hueShift.value, 0), -180, 180),
      pixelSize: clamp(toInt(els.pixelSize.value, 3), 1, 12),
      maxWidth: clamp(toInt(els.maxWidth.value, 1400), 240, 4096),
      invert: els.invert.checked,
      exposure: clamp(toInt(els.exposure.value, 0), -200, 200) / 100,
      contrastCurve: clamp(toInt(els.contrastCurve.value, 0), -100, 100) / 100,
      highlightClip: clamp(toInt(els.highlightClip.value, 92), 50, 100) / 100,
      softKnee: clamp(toInt(els.softKnee.value, 14), 0, 60) / 100,
      brightnessBias: clamp(toInt(els.brightnessBias.value, 0), -60, 60) / 100,
      blackLevel: clamp(toInt(els.blackLevel.value, 0), 0, 60) / 100,

      glowEnabled: els.glowEnabled.checked,
      glowIntensity: clamp(toInt(els.glowIntensity.value, 45), 0, 100),
      glowRadius: clamp(toInt(els.glowRadius.value, 8), 0, 36),
      glowIterations: clamp(toInt(els.glowIterations.value, 2), 1, 8),
      bloomThreshold: clamp(toInt(els.bloomThreshold.value, 72), 0, 100) / 100,
      bloomTint: els.bloomTint.value,
      bloomHalo: clamp(toInt(els.bloomHalo.value, 18), 0, 100) / 100,
      bloomGrain: clamp(toInt(els.bloomGrain.value, 8), 0, 100) / 100,

      chromaEnabled: els.chromaEnabled.checked,
      chromaMode: els.chromaMode.value,
      chromaStrength: clamp(toInt(els.chromaStrength.value, 20), 0, 120) / 10,
      chromaAngle: clamp(toInt(els.chromaAngle.value, 0), -180, 180),
      chromaBalance: clamp(toInt(els.chromaBalance.value, 100), 20, 200) / 100,
      chromaEdgeWeight: clamp(toInt(els.chromaEdgeWeight.value, 60), 0, 100) / 100,
      rShift: clamp(toInt(els.rShift.value, 100), -200, 200) / 100,
      gShift: clamp(toInt(els.gShift.value, 0), -200, 200) / 100,
      bShift: clamp(toInt(els.bShift.value, -100), -200, 200) / 100,

      animatePreview: els.animatePreview.checked,
      shimmerEnabled: els.shimmerEnabled.checked,
      shimmerNoiseType: els.shimmerNoiseType.value,
      shimmerAmount: clamp(toInt(els.shimmerAmount.value, 18), 0, 100),
      shimmerScale: clamp(toInt(els.shimmerScale.value, 7), 2, 28),
      shimmerSpeed: clamp(toInt(els.shimmerSpeed.value, 12), 1, 60) / 10,

      waveEnabled: els.waveEnabled.checked,
      waveFrequency: clamp(toInt(els.waveFrequency.value, 18), 1, 80) / 10,
      waveAmplitude: clamp(toInt(els.waveAmplitude.value, 10), 0, 100),
      waveSpeed: clamp(toInt(els.waveSpeed.value, 10), 1, 80) / 10,

      exportDuration: clamp(toInt(els.exportDuration.value, 5), 1, 12),
      exportFps: clamp(toInt(els.exportFps.value, 24), 12, 60),
      transparentExport: els.transparentExport.checked,
      previewBgEnabled: els.previewBgEnabled.checked,
      previewBgColor: els.previewBgColor.value,
      prismaticGlitchAmount: activePresetName === "prismatic-glitch-gradient"
        ? (PRESETS["prismatic-glitch-gradient"].prismaticGlitchAmount || 0) / 100
        : 0,

      asciiChars: (els.asciiChars.value || DEFAULTS.asciiChars).slice(0, 128),
      asciiCell: clamp(toInt(els.asciiCell.value, 4), 2, 12)
    };
  }

  function hasAnimatedEffects(settings) {
    if (!settings) return false;
    return (
      (settings.shimmerEnabled && settings.shimmerAmount > 0) ||
      (settings.waveEnabled && settings.waveAmplitude > 0)
    );
  }

  function preprocessImageData(data, settings) {
    const luminance = new Float32Array(data.length / 4);
    const alpha = new Float32Array(data.length / 4);
    const contrast = settings.contrast / 100;
    const contrastFactor = (1 + contrast) * (1 + contrast);
    const satFactor = settings.saturation / 100;
    const exposureScale = Math.pow(2, settings.exposure);
    const knee = Math.max(0.0001, settings.softKnee);
    const highlightClip = clamp(settings.highlightClip, 0.3, 1);

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const a = data[i + 3] / 255;
      alpha[p] = a;

      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      r += settings.brightness;
      g += settings.brightness;
      b += settings.brightness;

      r = ((((r / 255) - 0.5) * contrastFactor) + 0.5) * 255;
      g = ((((g / 255) - 0.5) * contrastFactor) + 0.5) * 255;
      b = ((((b / 255) - 0.5) * contrastFactor) + 0.5) * 255;

      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = gray + (r - gray) * satFactor;
      g = gray + (g - gray) * satFactor;
      b = gray + (b - gray) * satFactor;

      if (settings.hueShift !== 0) {
        const hsl = rgbToHsl(clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255));
        hsl[0] = (hsl[0] + settings.hueShift / 360 + 1) % 1;
        const rgb = hslToRgb(hsl[0], hsl[1], hsl[2]);
        r = rgb[0];
        g = rgb[1];
        b = rgb[2];
      }

      r = 255 * Math.pow(clamp(r, 0, 255) / 255, 1 / settings.gamma);
      g = 255 * Math.pow(clamp(g, 0, 255) / 255, 1 / settings.gamma);
      b = 255 * Math.pow(clamp(b, 0, 255) / 255, 1 / settings.gamma);

      let rn = clamp01((r / 255) * exposureScale + settings.brightnessBias);
      let gn = clamp01((g / 255) * exposureScale + settings.brightnessBias);
      let bn = clamp01((b / 255) * exposureScale + settings.brightnessBias);

      rn = remapBlackLevel(rn, settings.blackLevel);
      gn = remapBlackLevel(gn, settings.blackLevel);
      bn = remapBlackLevel(bn, settings.blackLevel);

      rn = applyContrastCurve(rn, settings.contrastCurve);
      gn = applyContrastCurve(gn, settings.contrastCurve);
      bn = applyContrastCurve(bn, settings.contrastCurve);

      rn = applyHighlightRollOff(rn, highlightClip, knee);
      gn = applyHighlightRollOff(gn, highlightClip, knee);
      bn = applyHighlightRollOff(bn, highlightClip, knee);

      let luma = (0.2126 * rn + 0.7152 * gn + 0.0722 * bn) * 255;
      if (settings.invert) {
        luma = 255 - luma;
      }

      luminance[p] = clamp(luma, 0, 255);
    }

    return { luminance, alpha };
  }

  function buildPalette(settings) {
    const steps = Math.max(2, settings.paletteSteps);
    let anchors = [];

    if (settings.palettePreset === "electric-blue") {
      anchors = [
        [6, 20, 50],
        [31, 125, 184],
        [96, 224, 255],
        [255, 255, 255]
      ];
    } else if (settings.palettePreset === "amber-ochre") {
      anchors = [
        [40, 20, 8],
        [95, 52, 13],
        [196, 132, 45],
        [255, 241, 209]
      ];
    } else if (settings.customPalette) {
      anchors = parseCustomPalette(settings.customPalette);
    }

    if (!anchors.length) {
      const bg = hexToRgb(settings.backgroundColor);
      const fg = hexToRgb(settings.foregroundColor);
      const accent = hexToRgb(settings.accentColor);
      if (settings.accentEnabled && steps > 2) {
        anchors = [bg, accent, fg];
      } else {
        anchors = [bg, fg];
      }
    }

    return interpolatePaletteAnchors(anchors, steps);
  }

  function ditherLuminance(luminance, width, height, settings, levels) {
    switch (settings.ditheringType) {
      case "error-diffusion":
        return ditherErrorDiffusion(luminance, width, height, levels, settings);
      case "ordered":
        return ditherOrdered(luminance, width, height, levels, settings);
      case "threshold":
        return ditherThreshold(luminance, width, height, levels, settings.threshold, settings);
      case "noise":
        return ditherNoise(luminance, width, height, levels, settings.noiseAmount, settings);
      default:
        return ditherErrorDiffusion(luminance, width, height, levels, settings);
    }
  }

  function ditherErrorDiffusion(luminance, width, height, levels, settings) {
    const map = DIFFUSION_KERNELS[settings.diffusionMap] || DIFFUSION_KERNELS["floyd-steinberg"];
    const work = new Float32Array(luminance);
    const out = new Uint8Array(luminance.length);
    const gradientAware = settings.gradientDitherMode === "gradient-diffusion";

    for (let y = 0; y < height; y++) {
      const serpentine = gradientAware && (y % 2 === 1);
      const xStart = serpentine ? width - 1 : 0;
      const xEnd = serpentine ? -1 : width;
      const xStep = serpentine ? -1 : 1;

      for (let x = xStart; x !== xEnd; x += xStep) {
        const idx = y * width + x;
        const oldValue = work[idx] + getPatternOffset(x, y, settings, width, height);
        const quantized = quantizeToIndex(oldValue, levels);
        const snapped = indexToValue(quantized, levels);
        const error = oldValue - snapped;

        out[idx] = quantized;

        for (let i = 0; i < map.weights.length; i++) {
          const weight = map.weights[i];
          const wx = serpentine ? -weight[0] : weight[0];
          const nx = x + wx;
          const ny = y + weight[1];
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const ni = ny * width + nx;
          const damping = gradientAware ? 0.9 : 1;
          work[ni] += error * (weight[2] / map.divisor) * damping;
        }
      }
    }

    return out;
  }

  function ditherOrdered(luminance, width, height, levels, settings) {
    const matrix = settings.orderedMatrix === "bayer4" ? BAYER_4 : BAYER_8;
    const size = settings.orderedMatrix === "bayer4" ? 4 : 8;
    const denom = matrix.length;
    const strength = settings.gradientDitherMode === "blue-noise-ordered" ? 128 : 180;
    const out = new Uint8Array(luminance.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const cell = matrix[(y % size) * size + (x % size)];
        let offset = ((cell + 0.5) / denom - 0.5) * strength;
        if (settings.gradientDitherMode === "blue-noise-ordered") {
          const bn = blueNoise((x + settings.temporalPhase * 0.6) * 0.75, (y + settings.temporalPhase * 0.4) * 0.75, settings.temporalPhase * 0.08);
          offset += (bn - 0.5) * 72;
        }
        offset += getPatternOffset(x, y, settings, width, height);
        out[idx] = quantizeToIndex(luminance[idx] + offset, levels);
      }
    }

    return out;
  }

  function ditherThreshold(luminance, width, height, levels, threshold, settings) {
    const out = new Uint8Array(luminance.length);
    if (levels === 2) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = y * width + x;
          out[i] = luminance[i] + getPatternOffset(x, y, settings, width, height) >= threshold ? 1 : 0;
        }
      }
      return out;
    }

    const shift = threshold - 128;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        out[i] = quantizeToIndex(luminance[i] + shift + getPatternOffset(x, y, settings, width, height), levels);
      }
    }
    return out;
  }

  function ditherNoise(luminance, width, height, levels, noiseAmount, settings) {
    const out = new Uint8Array(luminance.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const noise = (Math.random() * 2 - 1) * noiseAmount;
        out[i] = quantizeToIndex(luminance[i] + noise + getPatternOffset(x, y, settings, width, height), levels);
      }
    }
    return out;
  }

  function drawIndexedCanvas(indices, palette, width, height, alphaMask, settings) {
    stagedCanvas.width = width;
    stagedCanvas.height = height;

    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < indices.length; i++) {
      const color = palette[indices[i]];
      const o = i * 4;
      data[o] = color[0];
      data[o + 1] = color[1];
      data[o + 2] = color[2];
      const baseAlpha = alphaMask ? alphaMask[i] : 1;
      if (settings.transparentExport) {
        const norm = palette.length > 1 ? indices[i] / (palette.length - 1) : 1;
        const mapped = indices[i] === 0 ? 0 : (0.18 + 0.82 * Math.pow(norm, 0.7));
        data[o + 3] = clamp(Math.round(baseAlpha * mapped * 255), 0, 255);
      } else {
        data[o + 3] = clamp(Math.round(baseAlpha * 255), 0, 255);
      }
    }

    stagedCtx.putImageData(new ImageData(data, width, height), 0, 0);
  }

  function buildAsciiData(luminance, width, height, settings, levels) {
    const charset = uniqueChars(settings.asciiChars);
    const cellW = settings.asciiCell;
    const cellH = Math.max(2, Math.round(cellW * 1.7));
    const cols = Math.max(1, Math.floor(width / cellW));
    const rows = Math.max(1, Math.floor(height / cellH));

    const lines = [];
    const glyphs = [];

    for (let row = 0; row < rows; row++) {
      const y0 = row * cellH;
      let line = "";

      for (let col = 0; col < cols; col++) {
        const x0 = col * cellW;
        let total = 0;
        let count = 0;

        for (let y = y0; y < Math.min(y0 + cellH, height); y++) {
          for (let x = x0; x < Math.min(x0 + cellW, width); x++) {
            total += luminance[y * width + x];
            count++;
          }
        }

        const avg = count ? total / count : 0;
        const t = clamp(avg / 255, 0, 1);
        const charIndex = Math.round((1 - t) * (charset.length - 1));
        const char = charset[clamp(charIndex, 0, charset.length - 1)] || " ";
        const colorIndex = quantizeToIndex(avg, levels);

        line += char;
        glyphs.push({ x: x0, y: y0, char, colorIndex });
      }

      lines.push(line);
    }

    return { lines, glyphs, cols, rows, cellW, cellH, width, height };
  }

  function drawAsciiCanvas(asciiData, palette, settings, width, height, alphaMask) {
    stagedCanvas.width = width;
    stagedCanvas.height = height;
    stagedCtx.clearRect(0, 0, width, height);
    if (!settings.transparentExport) {
      const bg = hexToRgb(settings.backgroundColor);
      stagedCtx.fillStyle = rgbToCss(bg);
      stagedCtx.fillRect(0, 0, width, height);
    }

    stagedCtx.textBaseline = "top";
    stagedCtx.font = `${asciiData.cellH}px "IBM Plex Mono", ui-monospace, monospace`;

    for (let i = 0; i < asciiData.glyphs.length; i++) {
      const glyph = asciiData.glyphs[i];
      const color = palette[glyph.colorIndex] || palette[palette.length - 1];
      const alpha = alphaMask ? sampleAlphaMask(alphaMask, width, height, glyph.x, glyph.y, asciiData.cellW, asciiData.cellH) : 1;
      const mapped = glyph.colorIndex === 0 ? 0 : (0.2 + 0.8 * Math.pow(glyph.colorIndex / Math.max(1, palette.length - 1), 0.75));
      const finalAlpha = settings.transparentExport ? alpha * mapped : alpha;
      stagedCtx.fillStyle = `rgba(${Math.round(color[0])}, ${Math.round(color[1])}, ${Math.round(color[2])}, ${finalAlpha})`;
      stagedCtx.fillText(glyph.char, glyph.x, glyph.y);
    }
  }

  function applyWaveWarp(ctx, width, height, timeSec, settings) {
    const amplitudePx = (settings.waveAmplitude / 100) * 22;
    if (amplitudePx <= 0) return;

    const freq = settings.waveFrequency;
    const speed = settings.waveSpeed;
    const srcImage = ctx.getImageData(0, 0, width, height);
    const src = srcImage.data;
    const out = new Uint8ClampedArray(src.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const waveA = Math.sin((y / Math.max(1, height)) * Math.PI * freq * 2 + timeSec * speed * 2.4);
        const waveB = Math.cos((x / Math.max(1, width)) * Math.PI * (freq * 0.8) + timeSec * speed * 1.7);

        const sx = clamp(Math.round(x + waveA * amplitudePx), 0, width - 1);
        const sy = clamp(Math.round(y + waveB * amplitudePx * 0.45), 0, height - 1);

        const si = (sy * width + sx) * 4;
        const di = (y * width + x) * 4;

        out[di] = src[si];
        out[di + 1] = src[si + 1];
        out[di + 2] = src[si + 2];
        out[di + 3] = src[si + 3];
      }
    }

    ctx.putImageData(new ImageData(out, width, height), 0, 0);
  }

  function applyShimmerOverlay(ctx, width, height, timeSec, settings) {
    const img = ctx.getImageData(0, 0, width, height);
    const data = img.data;

    const amount = settings.shimmerAmount / 100;
    const scale = Math.max(2, settings.shimmerScale);
    const speed = settings.shimmerSpeed;
    const mode = settings.shimmerNoiseType;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const luma = (data[i] + data[i + 1] + data[i + 2]) / 765;

        let n = mode === "blue"
          ? blueNoise(x / scale, y / scale, timeSec * speed)
          : valueNoise(x / scale, y / scale, timeSec * speed);

        n = (n - 0.5) * 2;
        const factor = 1 + n * amount * (0.35 + luma * 0.95);

        let r = data[i] * factor;
        let g = data[i + 1] * factor;
        let b = data[i + 2] * factor;

        if (n > 0.88 && luma > 0.44) {
          const sparkle = (n - 0.88) * 180 * amount;
          r += sparkle;
          g += sparkle;
          b += sparkle;
        }

        data[i] = clamp(Math.round(r), 0, 255);
        data[i + 1] = clamp(Math.round(g), 0, 255);
        data[i + 2] = clamp(Math.round(b), 0, 255);
      }
    }

    ctx.putImageData(img, 0, 0);
  }

  function applyChromaticAberrationAdvanced(ctx, width, height, settings) {
    const srcImage = ctx.getImageData(0, 0, width, height);
    const src = srcImage.data;
    const out = new Uint8ClampedArray(src.length);

    const strength = settings.chromaStrength;
    const angle = settings.chromaAngle * (Math.PI / 180);
    const linearDx = Math.cos(angle);
    const linearDy = Math.sin(angle);
    const cx = (width - 1) * 0.5;
    const cy = (height - 1) * 0.5;
    const maxR = Math.max(1, Math.hypot(cx, cy));
    const balance = settings.chromaBalance;
    const edgeWeight = settings.chromaEdgeWeight;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const vx = x - cx;
        const vy = y - cy;
        const radius01 = Math.min(1, Math.hypot(vx, vy) / maxR);
        const edgeFactor = 1 + Math.pow(radius01, 1.2) * edgeWeight * 2.5;

        let dirX = linearDx;
        let dirY = linearDy;
        if (settings.chromaMode === "radial") {
          const len = Math.max(0.0001, Math.hypot(vx, vy));
          dirX = vx / len;
          dirY = vy / len;
        }

        const rs = strength * settings.rShift * balance * edgeFactor;
        const gs = strength * settings.gShift * edgeFactor;
        const bs = strength * settings.bShift * balance * edgeFactor;

        out[idx] = sampleChannelBilinear(src, width, height, x + dirX * rs, y + dirY * rs, 0);
        out[idx + 1] = sampleChannelBilinear(src, width, height, x + dirX * gs, y + dirY * gs, 1);
        out[idx + 2] = sampleChannelBilinear(src, width, height, x + dirX * bs, y + dirY * bs, 2);
        out[idx + 3] = src[idx + 3];
      }
    }

    ctx.putImageData(new ImageData(out, width, height), 0, 0);
  }

  function applyHighlightBloom(ctx, width, height, settings) {
    const intensity = settings.glowIntensity / 100;
    if (intensity <= 0) return;

    ensureCanvasSize(bloomMaskCanvas, width, height);
    ensureCanvasSize(blurCanvas, width, height);
    ensureCanvasSize(bloomTempCanvas, width, height);

    const srcImage = ctx.getImageData(0, 0, width, height);
    const src = srcImage.data;
    const bright = new Uint8ClampedArray(src.length);
    const threshold = settings.bloomThreshold;
    const knee = Math.max(0.03, settings.softKnee);
    const tint = hexToRgb(settings.bloomTint);

    for (let i = 0; i < src.length; i += 4) {
      const a = src[i + 3] / 255;
      if (a <= 0.001) continue;
      const l = ((src[i] / 255) * 0.2126) + ((src[i + 1] / 255) * 0.7152) + ((src[i + 2] / 255) * 0.0722);
      const weight = smoothstep(threshold - knee, threshold + knee, l);
      if (weight <= 0) continue;

      bright[i] = clamp(Math.round(src[i] * (tint[0] / 255) * weight), 0, 255);
      bright[i + 1] = clamp(Math.round(src[i + 1] * (tint[1] / 255) * weight), 0, 255);
      bright[i + 2] = clamp(Math.round(src[i + 2] * (tint[2] / 255) * weight), 0, 255);
      bright[i + 3] = clamp(Math.round(src[i + 3] * weight), 0, 255);
    }

    bloomMaskCtx.putImageData(new ImageData(bright, width, height), 0, 0);

    blurCtx.clearRect(0, 0, width, height);
    blurCtx.drawImage(bloomMaskCanvas, 0, 0);

    const passes = Math.max(1, settings.glowIterations);
    const radius = settings.glowRadius;
    for (let p = 0; p < passes; p++) {
      const passRadius = Math.max(0.5, radius * (0.55 + p * 0.33));
      bloomTempCtx.clearRect(0, 0, width, height);
      bloomTempCtx.filter = `blur(${passRadius}px)`;
      bloomTempCtx.drawImage(blurCanvas, 0, 0);
      bloomTempCtx.filter = "none";
      blurCtx.clearRect(0, 0, width, height);
      blurCtx.drawImage(bloomTempCanvas, 0, 0);
    }

    if (settings.bloomGrain > 0) {
      const blurImage = blurCtx.getImageData(0, 0, width, height);
      const noiseAmp = settings.bloomGrain * 40;
      for (let i = 0; i < blurImage.data.length; i += 4) {
        if (blurImage.data[i + 3] === 0) continue;
        const n = (Math.random() * 2 - 1) * noiseAmp;
        blurImage.data[i] = clamp(blurImage.data[i] + n, 0, 255);
        blurImage.data[i + 1] = clamp(blurImage.data[i + 1] + n, 0, 255);
        blurImage.data[i + 2] = clamp(blurImage.data[i + 2] + n, 0, 255);
      }
      blurCtx.putImageData(blurImage, 0, 0);
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = intensity;
    ctx.drawImage(blurCanvas, 0, 0, width, height);

    if (settings.bloomHalo > 0) {
      ctx.globalAlpha = settings.bloomHalo * 0.33;
      ctx.drawImage(bloomMaskCanvas, 0, 0, width, height);
    }
    ctx.restore();
  }

  function applyPrismaticGlitchPass(ctx, width, height, timeSec, settings) {
    const amount = clamp(settings.prismaticGlitchAmount, 0, 1);
    if (amount <= 0) return;

    ensureCanvasSize(bloomTempCanvas, width, height);
    bloomTempCtx.clearRect(0, 0, width, height);
    bloomTempCtx.drawImage(ctx.canvas, 0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "rgba(142, 224, 255, 0.22)");
    grad.addColorStop(0.45, "rgba(255, 144, 225, 0.18)");
    grad.addColorStop(1, "rgba(141, 133, 255, 0.2)");
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.22 * amount;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.08 * amount;
    ctx.globalCompositeOperation = "source-over";
    const lines = Math.max(12, Math.floor(height / 16));
    for (let i = 0; i < lines; i++) {
      const y = Math.floor((i / lines) * height);
      const h = (i % 3 === 0) ? 2 : 1;
      ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.15)";
      ctx.fillRect(0, y, width, h);
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.12 * amount;
    const stripes = 10;
    for (let i = 0; i < stripes; i++) {
      const base = hash31(i * 3.1, 8.6, 5.2);
      const sx = Math.floor(base * (width - 4));
      const sw = 1 + (i % 3);
      const wobble = Math.sin(timeSec * 0.6 + i * 0.8) * 1.4;
      const dx = clamp(Math.round(sx + wobble), 0, Math.max(0, width - sw));
      ctx.drawImage(bloomTempCanvas, sx, 0, sw, height, dx, 0, sw, height);
    }
    ctx.restore();
  }

  function downloadSvg() {
    if (!lastResult) return;
    const svg = lastResult.type === "ascii" ? buildAsciiSvg(lastResult) : buildPixelSvg(lastResult);
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    triggerDownload(blob, `dither-static-${Date.now()}.svg`);
  }

  function downloadAnimatedSvg() {
    if (!lastResult || !currentSettings) return;
    const svg = buildAnimatedSvg(lastResult, currentSettings);
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    triggerDownload(blob, `dither-animated-${Date.now()}.svg`);
  }

  async function downloadVideo() {
    if (!lastResult || !currentSettings || exportBusy) return;
    if (typeof MediaRecorder === "undefined") {
      els.statusLine.textContent = "Video export unavailable in this browser (MediaRecorder not supported).";
      return;
    }

    exportBusy = true;
    els.downloadVideo.disabled = true;
    let restoreVideoState = null;

    try {
      const settings = { ...currentSettings };
      const fps = clamp(settings.exportFps, 12, 60);
      const dynamicInput = sourceKind === "video" || sourceKind === "gif" || sourceKind === "svg-animated";
      const mediaDuration = getSourceDurationSeconds();
      const exportDuration = dynamicInput && Number.isFinite(mediaDuration) && mediaDuration > 0
        ? Math.min(settings.exportDuration, mediaDuration)
        : settings.exportDuration;
      const requestedFrames = Math.round(exportDuration * fps);
      const frameCount = clamp(requestedFrames, 1, 360);
      const duration = frameCount / fps;
      const drawable = getActiveDrawable();
      const srcSize = getDrawableSize(drawable);
      const width = Math.max(1, Math.round(Math.min(settings.maxWidth, srcSize.width || lastResult.width)));
      const height = Math.max(1, Math.round((width * (srcSize.height || lastResult.height)) / Math.max(1, (srcSize.width || lastResult.width))));

      ensureCanvasSize(exportCanvas, width, height);

      const preferredMimes = [
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
        "video/mp4",
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm"
      ];

      const chosenMime = preferredMimes.find((m) => {
        try {
          return MediaRecorder.isTypeSupported(m);
        } catch (_err) {
          return false;
        }
      }) || "";

      const stream = exportCanvas.captureStream(fps);
      const recorder = chosenMime ? new MediaRecorder(stream, { mimeType: chosenMime }) : new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      const stopPromise = new Promise((resolve) => {
        recorder.onstop = resolve;
      });

      restoreVideoState = sourceKind === "video" && sourceVideo
        ? {
            paused: sourceVideo.paused,
            currentTime: sourceVideo.currentTime
          }
        : null;

      if (sourceKind === "video" && sourceVideo) {
        sourceVideo.pause();
      }

      recorder.start();
      els.statusLine.textContent = `Rendering ${frameCount} frames (${duration.toFixed(2)}s)...`;

      for (let i = 0; i < frameCount; i++) {
        const t = i / fps;
        if (sourceKind === "video" && sourceVideo) {
          const targetTime = Number.isFinite(mediaDuration) && mediaDuration > 0
            ? (t % mediaDuration)
            : t;
          await seekVideoFrame(sourceVideo, targetTime);
          sourceImage = sourceVideo;
          lastSourceFrameToken = `v:${Math.floor(sourceVideo.currentTime * 120)}`;
          processImage({
            drawable: sourceVideo,
            settingsOverride: settings,
            timeSec: t,
            targetCtx: exportCtx,
            updatePreview: false,
            skipStatus: true
          });
        } else if (sourceKind === "gif" && sourceGif && sourceGif.frames && sourceGif.frames.length) {
          const totalMs = Math.max(20, sourceGif.totalDurationMs || 20);
          const localMs = (t * 1000) % totalMs;
          const frameIdx = findTimelineFrameIndex(localMs, sourceGif.timelineMs);
          sourceImage = sourceGif.frames[frameIdx].bitmap;
          lastSourceFrameToken = `g:${frameIdx}`;
          processImage({
            drawable: sourceImage,
            settingsOverride: settings,
            timeSec: t,
            targetCtx: exportCtx,
            updatePreview: false,
            skipStatus: true
          });
        } else if (sourceKind === "svg-animated" && sourceImage) {
          processImage({
            drawable: sourceImage,
            settingsOverride: settings,
            timeSec: t,
            targetCtx: exportCtx,
            updatePreview: false,
            skipStatus: true
          });
        } else {
          renderProcessedAtTime(t, true, exportCtx, width, height);
        }
        if (i % 10 === 0 || i === frameCount - 1) {
          els.statusLine.textContent = `Rendering video frame ${i + 1}/${frameCount}...`;
        }
        await waitMs(Math.max(8, Math.round(1000 / fps)));
      }

      recorder.stop();
      await stopPromise;
      stream.getTracks().forEach((track) => track.stop());

      if (!chunks.length) {
        els.statusLine.textContent = "Video export failed: no data captured.";
        return;
      }

      const blobType = recorder.mimeType || chosenMime || "video/webm";
      const blob = new Blob(chunks, { type: blobType });
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";

      triggerDownload(blob, `dither-motion-${Date.now()}.${ext}`);
      els.statusLine.textContent = `Video export complete (${ext.toUpperCase()}).`;
    } catch (err) {
      els.statusLine.textContent = `Video export error: ${err && err.message ? err.message : "unknown error"}`;
    } finally {
      if (restoreVideoState && sourceVideo) {
        await seekVideoFrame(sourceVideo, restoreVideoState.currentTime).catch(() => {});
        sourceImage = sourceVideo;
        if (!restoreVideoState.paused) {
          sourceVideo.play().catch(() => {});
        }
      }
      exportBusy = false;
      els.downloadVideo.disabled = false;
      markFrameDirty();
    }
  }

  function buildAnimatedSvg(result, settings) {
    const width = result.width;
    const height = result.height;
    if (!width || !height) return "";

    const snapshotUrl = renderFrameDataUrl(0, "image/png", 1);
    const duration = clamp(settings.exportDuration, 1, 12);

    const baseFreqX = settings.shimmerNoiseType === "blue"
      ? clamp((1 / settings.shimmerScale) * 0.9, 0.02, 0.25)
      : clamp((1 / settings.shimmerScale) * 0.45, 0.01, 0.13);
    const baseFreqY = clamp(baseFreqX * 1.15, 0.01, 0.3);

    const displacement = Math.round((settings.shimmerEnabled ? settings.shimmerAmount * 0.35 : 0) + (settings.waveEnabled ? settings.waveAmplitude * 0.22 : 0));
    const disp = clamp(displacement, 0, 60);

    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      "<defs>",
      "<filter id=\"motionFx\" x=\"-20%\" y=\"-20%\" width=\"140%\" height=\"140%\">",
      `<feTurbulence type="fractalNoise" baseFrequency="${baseFreqX.toFixed(4)} ${baseFreqY.toFixed(4)}" numOctaves="2" seed="2" result="noise">`,
      `<animate attributeName="seed" values="2;90;160;2" dur="${duration}s" repeatCount="indefinite"/>`,
      `<animate attributeName="baseFrequency" values="${baseFreqX.toFixed(4)} ${baseFreqY.toFixed(4)};${(baseFreqX * 1.2).toFixed(4)} ${(baseFreqY * 0.86).toFixed(4)};${baseFreqX.toFixed(4)} ${baseFreqY.toFixed(4)}" dur="${duration}s" repeatCount="indefinite"/>`,
      "</feTurbulence>",
      `<feDisplacementMap in="SourceGraphic" in2="noise" scale="${disp}" xChannelSelector="R" yChannelSelector="G"/>`,
      "</filter>",
      "</defs>",
      `<image href="${snapshotUrl}" width="${width}" height="${height}" filter="url(#motionFx)"/>`,
      "</svg>"
    ].join("");

    return svg;
  }

  function renderFrameDataUrl(timeSec, mime = "image/png", quality = 1) {
    if (!lastResult) return "";
    const width = lastResult.width;
    const height = lastResult.height;

    ensureCanvasSize(exportCanvas, width, height);
    renderProcessedAtTime(timeSec, true, exportCtx, width, height);
    return exportCanvas.toDataURL(mime, quality);
  }

  function buildPixelSvg(result) {
    if (!result.indices || !result.indices.length) return "";

    const pathByColor = new Map();
    const width = result.cellsW;
    const height = result.cellsH;
    const scale = Math.max(1, result.pixelSize);

    for (let y = 0; y < height; y++) {
      let x = 0;
      while (x < width) {
        const idx = result.indices[y * width + x];
        let run = 1;
        while (x + run < width && result.indices[y * width + x + run] === idx) {
          run++;
        }

        if (idx !== 0) {
          const path = pathByColor.get(idx) || "";
          pathByColor.set(idx, `${path}M${x} ${y}h${run}v1h-${run}z`);
        }

        x += run;
      }
    }

    const svgWidth = width * scale;
    const svgHeight = height * scale;
    const bgHex = rgbToHex(result.palette[0]);

    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" shape-rendering="crispEdges">`,
      `<rect width="100%" height="100%" fill="${bgHex}"/>`,
      `<g transform="scale(${scale})">`
    ];

    pathByColor.forEach((path, colorIndex) => {
      parts.push(`<path fill="${rgbToHex(result.palette[colorIndex])}" d="${path}"/>`);
    });

    parts.push("</g>", "</svg>");
    return parts.join("");
  }

  function buildAsciiSvg(result) {
    if (!result.asciiData || !result.asciiData.lines.length) return "";

    const ascii = result.asciiData;
    const scale = Math.max(1, result.pixelSize);
    const charW = ascii.cellW * scale;
    const charH = ascii.cellH * scale;
    const width = Math.max(1, Math.round(ascii.cols * charW));
    const height = Math.max(1, Math.round(ascii.rows * charH));

    const lines = ascii.lines
      .map((line, idx) => `<tspan x="0" y="${idx * charH}">${escapeXml(line)}</tspan>`)
      .join("");

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `<rect width="100%" height="100%" fill="${result.backgroundColor}"/>`,
      `<text xml:space="preserve" fill="${result.foregroundColor}" font-family="'IBM Plex Mono', monospace" font-size="${charH}" dominant-baseline="hanging">${lines}</text>`,
      "</svg>"
    ].join("");
  }

  function downloadCanvas(format) {
    if (!lastResult) return;
    const mime = format === "webp" ? "image/webp" : "image/png";
    const quality = format === "webp" ? 0.92 : 1;
    const width = lastResult.width;
    const height = lastResult.height;
    ensureCanvasSize(exportCanvas, width, height);
    const restorePreview = currentSettings && currentSettings.previewBgEnabled;
    if (currentSettings && currentSettings.transparentExport) {
      currentSettings.previewBgEnabled = false;
    }
    renderProcessedAtTime(performance.now() / 1000, true, exportCtx, width, height);
    if (currentSettings && currentSettings.transparentExport) {
      currentSettings.previewBgEnabled = Boolean(restorePreview);
    }
    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      triggerDownload(blob, `dither-${Date.now()}.${format}`);
    }, mime, quality);
  }

  function downloadAsciiText() {
    if (!lastResult || lastResult.type !== "ascii" || !lastResult.asciiData) return;
    const text = `${lastResult.asciiData.lines.join("\n")}\n`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    triggerDownload(blob, `dither-${Date.now()}.txt`);
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function createDemoImage() {
    cleanupActiveSource();
    const c = document.createElement("canvas");
    c.width = 1440;
    c.height = 900;
    const ctx = c.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, c.width, c.height);
    grad.addColorStop(0, "#f8eec9");
    grad.addColorStop(0.5, "#81c6df");
    grad.addColorStop(1, "#223a66");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, c.width, c.height);

    for (let i = 0; i < 26; i++) {
      ctx.beginPath();
      ctx.fillStyle = `hsla(${180 + i * 5}, 70%, ${30 + i * 2}%, 0.17)`;
      const x = Math.random() * c.width;
      const y = Math.random() * c.height;
      const r = 40 + Math.random() * 240;
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(7, 16, 33, 0.74)";
    ctx.fillRect(110, 110, 420, 650);
    ctx.fillStyle = "#f7f2df";
    ctx.font = "800 130px Archivo";
    ctx.fillText("D", 220, 290);
    ctx.fillText("L", 220, 430);
    ctx.font = "500 56px IBM Plex Mono";
    ctx.fillText("DITHER LAB", 145, 575);

    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(540, 175);
    ctx.bezierCurveTo(820, 26, 1040, 215, 1240, 92);
    ctx.stroke();

    const img = new Image();
    img.onload = () => {
      sourceKind = "image";
      sourceVideo = null;
      sourceGif = null;
      sourceImage = img;
      sourceClockStartSec = performance.now() / 1000;
      lastSourceFrameToken = "";
      scheduleProcess();
      els.statusLine.textContent = "Demo image loaded. Upload image/video media to replace it.";
    };
    img.src = c.toDataURL("image/png");
  }

  function getPatternOffset(x, y, settings, width, height) {
    let offset = 0;
    if (settings.gradientDitherMode === "blue-noise-ordered") {
      const n = blueNoise(x * 0.62, y * 0.62, settings.temporalPhase * 0.05);
      offset += (n - 0.5) * 22;
    }
    if (settings.temporalDither) {
      const phase = settings.temporalPhase;
      const px = (x + phase * 1.7) / Math.max(1, width);
      const py = (y - phase * 0.9) / Math.max(1, height);
      const n = valueNoise(px * 32, py * 32, phase * 0.12);
      offset += (n - 0.5) * 18;
    }
    return offset;
  }

  function sampleAlphaMask(alphaMask, width, height, x0, y0, w, h) {
    let total = 0;
    let count = 0;
    for (let y = y0; y < Math.min(y0 + h, height); y++) {
      for (let x = x0; x < Math.min(x0 + w, width); x++) {
        total += alphaMask[y * width + x];
        count++;
      }
    }
    return count > 0 ? total / count : 1;
  }

  function quantizeToIndex(value, levels) {
    const clamped = clamp(value, 0, 255);
    if (levels <= 2) {
      return clamped >= 127.5 ? 1 : 0;
    }
    const scaled = (clamped / 255) * (levels - 1);
    return clamp(Math.round(scaled), 0, levels - 1);
  }

  function indexToValue(index, levels) {
    if (levels <= 1) return 0;
    return (index / (levels - 1)) * 255;
  }

  function uniqueChars(input) {
    const seen = new Set();
    const chars = [];
    for (const ch of input) {
      if (!seen.has(ch)) {
        seen.add(ch);
        chars.push(ch);
      }
    }
    if (chars.length < 2) {
      return [" ", "@"];
    }
    return chars;
  }

  function blueNoise(x, y, t) {
    const a = hash31(x * 5.17 + 1.7, y * 5.83 - 9.2, t * 8.3);
    const b = hash31(x * 2.11 - 3.3, y * 2.93 + 7.7, t * 6.1);
    const c = hash31(x * 9.33 + 2.1, y * 9.61 - 4.9, t * 12.7);
    return clamp(0.5 + (a - b) * 0.65 + (c - 0.5) * 0.28, 0, 1);
  }

  function valueNoise(x, y, t) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;

    const n00 = hash31(xi, yi, t * 4.0);
    const n10 = hash31(xi + 1, yi, t * 4.0);
    const n01 = hash31(xi, yi + 1, t * 4.0);
    const n11 = hash31(xi + 1, yi + 1, t * 4.0);

    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);

    const nx0 = n00 + (n10 - n00) * u;
    const nx1 = n01 + (n11 - n01) * u;
    return nx0 + (nx1 - nx0) * v;
  }

  function hash31(x, y, z) {
    const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
    return s - Math.floor(s);
  }

  function ensureCanvasSize(canvas, width, height) {
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function waitMs(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  function findTimelineFrameIndex(localMs, timelineMs) {
    if (!timelineMs || !timelineMs.length) return 0;
    let lo = 0;
    let hi = timelineMs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (localMs < timelineMs[mid]) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }
    return clamp(lo, 0, timelineMs.length - 1);
  }

  function getSourceDurationSeconds() {
    if (sourceKind === "video" && sourceVideo && Number.isFinite(sourceVideo.duration) && sourceVideo.duration > 0) {
      return sourceVideo.duration;
    }
    if (sourceKind === "gif" && sourceGif && sourceGif.totalDurationMs > 0) {
      return sourceGif.totalDurationMs / 1000;
    }
    return null;
  }

  function seekVideoFrame(video, timeSec) {
    return new Promise((resolve, reject) => {
      if (!video || video.readyState < 1) {
        reject(new Error("video metadata not ready"));
        return;
      }
      const duration = Number.isFinite(video.duration) ? video.duration : null;
      const target = duration && duration > 0
        ? clamp(timeSec, 0, Math.max(0, duration - 0.001))
        : Math.max(0, timeSec);
      const done = () => {
        cleanup();
        resolve();
      };
      const fail = () => {
        cleanup();
        reject(new Error("video seek failed"));
      };
      const cleanup = () => {
        video.removeEventListener("seeked", done);
        video.removeEventListener("error", fail);
      };
      video.addEventListener("seeked", done, { once: true });
      video.addEventListener("error", fail, { once: true });
      try {
        video.currentTime = target;
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  }

  function hexToRgb(hex) {
    const sanitized = (hex || "#000000").replace("#", "").trim();
    const full = sanitized.length === 3
      ? sanitized.split("").map((c) => c + c).join("")
      : sanitized;

    const n = Number.parseInt(full, 16);
    if (Number.isNaN(n)) return [0, 0, 0];

    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbToHex(rgb) {
    return `#${rgb.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("")}`;
  }

  function normalizeHex(hex) {
    const rgb = hexToRgb(hex);
    return rgbToHex(rgb);
  }

  function rgbToCss(rgb) {
    return `rgb(${Math.round(rgb[0])} ${Math.round(rgb[1])} ${Math.round(rgb[2])})`;
  }

  function lerpRgb(a, b, t) {
    const u = clamp(t, 0, 1);
    return [
      Math.round(a[0] + (b[0] - a[0]) * u),
      Math.round(a[1] + (b[1] - a[1]) * u),
      Math.round(a[2] + (b[2] - a[2]) * u)
    ];
  }

  function rgbToHsl(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const d = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      switch (max) {
        case rn:
          h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
          break;
        case gn:
          h = ((bn - rn) / d + 2) / 6;
          break;
        default:
          h = ((rn - gn) / d + 4) / 6;
          break;
      }
    }

    return [h, s, l];
  }

  function hslToRgb(h, s, l) {
    if (s === 0) {
      const v = Math.round(l * 255);
      return [v, v, v];
    }

    const hue2rgb = (p, q, t) => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    return [
      Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
      Math.round(hue2rgb(p, q, h) * 255),
      Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
    ];
  }

  function escapeXml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function clamp01(value) {
    return clamp(value, 0, 1);
  }

  function smoothstep(edge0, edge1, x) {
    if (edge0 === edge1) return x < edge0 ? 0 : 1;
    const t = clamp01((x - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
  }

  function remapBlackLevel(v, blackLevel) {
    if (blackLevel <= 0) return clamp01(v);
    return clamp01((v - blackLevel) / Math.max(0.0001, 1 - blackLevel));
  }

  function applyContrastCurve(v, amount) {
    if (Math.abs(amount) < 0.0001) return clamp01(v);
    if (amount > 0) {
      const k = 1 + amount * 2.8;
      const centered = v - 0.5;
      return clamp01(0.5 + centered * k / (1 + Math.abs(centered) * (k - 1)));
    }
    const k = 1 + Math.abs(amount) * 1.4;
    return clamp01(Math.pow(v, 1 / k));
  }

  function applyHighlightRollOff(v, clip, knee) {
    const x = clamp01(v);
    if (x <= clip) return x;
    const over = x - clip;
    const compressed = clip + (1 - Math.exp(-over / Math.max(0.0001, knee))) * (1 - clip);
    return clamp01(compressed);
  }

  function parseCustomPalette(input) {
    const chunks = input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(s))
      .map(hexToRgb)
      .filter((rgb) => Array.isArray(rgb) && rgb.length === 3);
    return chunks.length >= 2 ? chunks : [];
  }

  function interpolatePaletteAnchors(anchors, steps) {
    if (!anchors || !anchors.length) return [[0, 0, 0], [255, 255, 255]];
    if (anchors.length === 1) return [anchors[0], anchors[0]];
    const out = [];
    for (let i = 0; i < steps; i++) {
      const t = i / Math.max(1, steps - 1);
      const segT = t * (anchors.length - 1);
      const seg = Math.min(anchors.length - 2, Math.floor(segT));
      const local = segT - seg;
      out.push(lerpRgb(anchors[seg], anchors[seg + 1], local));
    }
    return out;
  }

  function sampleChannelBilinear(src, width, height, fx, fy, channel) {
    const x = clamp(fx, 0, width - 1);
    const y = clamp(fy, 0, height - 1);
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(width - 1, x0 + 1);
    const y1 = Math.min(height - 1, y0 + 1);
    const tx = x - x0;
    const ty = y - y0;

    const i00 = (y0 * width + x0) * 4 + channel;
    const i10 = (y0 * width + x1) * 4 + channel;
    const i01 = (y1 * width + x0) * 4 + channel;
    const i11 = (y1 * width + x1) * 4 + channel;

    const a = src[i00] + (src[i10] - src[i00]) * tx;
    const b = src[i01] + (src[i11] - src[i01]) * tx;
    return clamp(Math.round(a + (b - a) * ty), 0, 255);
  }

  function toInt(value, fallback) {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  init();
})();
