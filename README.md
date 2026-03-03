# Dither Lab

Browser-first dithering studio for still and motion media.

Dither Lab converts images and video into high-production retro-digital visuals with advanced dithering, glow/bloom, chromatic aberration, palette design tools, and export options for modern web workflows.

## Highlights

- Media input: PNG, JPG/JPEG, WebP, GIF, MP4, SVG (animated SVG: best-effort frame capture mode)
- Dithering modes: Error Diffusion, Ordered Bayer, Threshold, Noise, ASCII
- Gradient-friendly dithering controls (including blue-noise-oriented strategy)
- Emissive post FX:
  - Highlight-weighted bloom with threshold, radius, multi-pass blur, tint, halo, grain
  - Channel-based chromatic aberration (radial/linear, balance, edge weighting)
- Motion FX: shimmer overlay and wave warp
- Designer presets:
  - Mono Dot, Gameboy, Vapor, Newsprint, CMYK, Hacker
  - Neon Glow, Shimmer
  - Prism Bloom, Inferno Halftone, Vintage Phosphor
  - Prismatic Glitch Gradient
- Before/after comparison slider with fixed-resolution clipping reveal
- Exports:
  - Static: SVG, PNG, WebP, ASCII TXT
  - Motion: Animated SVG, MP4/WebM via MediaRecorder pipeline
  - GIF inputs can be exported as processed MP4/WebM

## Quick Start

### Option 1: Open directly

Open `dither-lab.html` in your browser.

### Option 2: Serve locally (recommended)

```bash
cd dither-studio
python3 -m http.server 8080
```

Open: `http://localhost:8080/dither-lab.html`

## Project Structure

```text
dither-studio/
  dither-lab.html   # app shell + controls
  styles.css        # UI styling
  app.js            # rendering + processing pipeline
```

## Technical Notes

- Pure client-side implementation (no backend required)
- Single rendering pipeline reused for still images and frame-based video/GIF processing
- Real-time preview prioritized with debounced control updates and frame-aware refresh
- Transparent export path with alpha-safe compositing
- Deterministic preset behavior for reproducible renders

## Browser Support

- Modern Chromium-based browsers are recommended
- `MediaRecorder` is required for video export
- Animated GIF decoding uses `ImageDecoder` when available; unsupported browsers gracefully fall back to static GIF frame loading

## License

MIT (add `LICENSE` file if you want this explicitly published with the repo)
