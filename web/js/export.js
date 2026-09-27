/* Dither Lab — exporters: MP4 muxer (WebCodecs H.264), store-only ZIP, SVG builders. */
(() => {
  const DL = window.DL;
  const U = DL.util;
  const E = DL.engine;
  const X = (DL.exporters = {});

  /* ---------- byte helpers ---------- */
  const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  const u16 = (n) => [(n >>> 8) & 255, n & 255];
  const str = (s) => Array.from(s, (c) => c.charCodeAt(0) & 255);
  const concat = (parts) => {
    let len = 0;
    for (const p of parts) len += p.length;
    const out = new Uint8Array(len);
    let o = 0;
    for (const p of parts) {
      out.set(p, o);
      o += p.length;
    }
    return out;
  };
  const box = (type, ...payload) => {
    const body = concat(payload.map((p) => (p instanceof Uint8Array ? p : Uint8Array.from(p))));
    return concat([Uint8Array.from(u32(body.length + 8)), Uint8Array.from(str(type)), body]);
  };
  const fullbox = (type, version, flags, ...payload) => box(type, [version, (flags >> 16) & 255, (flags >> 8) & 255, flags & 255], ...payload);
  const MATRIX = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000].flatMap(u32);

  /* ---------- MP4 (single video track, moov at end) ---------- */
  class Mp4Muxer {
    constructor(width, height, fps) {
      this.w = width;
      this.h = height;
      this.fps = fps;
      this.timescale = fps * 1000;
      this.samples = [];
      this.desc = null;
    }
    add(chunk, meta) {
      if (meta && meta.decoderConfig && meta.decoderConfig.description && !this.desc) {
        const d = meta.decoderConfig.description;
        this.desc = d instanceof ArrayBuffer ? new Uint8Array(d.slice(0)) : new Uint8Array(d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength));
      }
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      this.samples.push({ data, key: chunk.type === "key", pts: chunk.timestamp });
    }
    finalize() {
      if (!this.desc) throw new Error("encoder produced no avcC description");
      const n = this.samples.length;
      const delta = Math.round(this.timescale / this.fps);
      const duration = n * delta;
      const ftyp = box("ftyp", str("isom"), u32(512), str("isom"), str("iso2"), str("avc1"), str("mp41"));
      let dataLen = 0;
      for (const s of this.samples) dataLen += s.data.length;
      const mdatHeader = Uint8Array.from([...u32(dataLen + 8), ...str("mdat")]);
      const dataOffset = ftyp.length + 8;
      // composition offsets if the encoder reordered frames
      const pts = this.samples.map((s) => Math.round((s.pts * this.timescale) / 1e6));
      const base = Math.min(...pts);
      const ctts = pts.map((p, i) => p - base - i * delta);
      const needCtts = ctts.some((c) => c !== 0);
      const keys = [];
      this.samples.forEach((s, i) => s.key && keys.push(i + 1));
      const compressor = new Array(32).fill(0);
      const name = str("Dither Lab");
      compressor[0] = name.length;
      name.forEach((c, i) => (compressor[i + 1] = c));
      const avc1 = box(
        "avc1",
        [0, 0, 0, 0, 0, 0], u16(1), u16(0), u16(0), u32(0), u32(0), u32(0),
        u16(this.w), u16(this.h), u32(0x00480000), u32(0x00480000), u32(0), u16(1), compressor, u16(0x0018), u16(0xffff),
        box("avcC", this.desc),
        box("pasp", u32(1), u32(1))
      );
      const stbl = box(
        "stbl",
        fullbox("stsd", 0, 0, u32(1), avc1),
        fullbox("stts", 0, 0, u32(1), u32(n), u32(delta)),
        ...(needCtts ? [fullbox("ctts", 1, 0, u32(n), ...ctts.map((c) => [...u32(1), ...u32(c >>> 0)]))] : []),
        fullbox("stss", 0, 0, u32(keys.length), ...keys.map(u32)),
        fullbox("stsc", 0, 0, u32(1), u32(1), u32(n), u32(1)),
        fullbox("stsz", 0, 0, u32(0), u32(n), ...this.samples.map((s) => u32(s.data.length))),
        fullbox("stco", 0, 0, u32(1), u32(dataOffset))
      );
      const trak = box(
        "trak",
        fullbox("tkhd", 0, 3, u32(0), u32(0), u32(1), u32(0), u32(duration), u32(0), u32(0), u16(0), u16(0), u16(0), u16(0), MATRIX, u32(this.w << 16), u32(this.h << 16)),
        box(
          "mdia",
          fullbox("mdhd", 0, 0, u32(0), u32(0), u32(this.timescale), u32(duration), u16(0x55c4), u16(0)),
          fullbox("hdlr", 0, 0, u32(0), str("vide"), u32(0), u32(0), u32(0), str("VideoHandler"), [0]),
          box("minf", fullbox("vmhd", 0, 1, u16(0), u16(0), u16(0), u16(0)), box("dinf", fullbox("dref", 0, 0, u32(1), fullbox("url ", 0, 1))), stbl)
        )
      );
      const mvhd = fullbox("mvhd", 0, 0, u32(0), u32(0), u32(this.timescale), u32(duration), u32(0x00010000), u16(0x0100), u16(0), u32(0), u32(0), MATRIX, new Array(24).fill(0), u32(2));
      const moov = box("moov", mvhd, trak);
      return new Blob([ftyp, mdatHeader, ...this.samples.map((s) => s.data), moov], { type: "video/mp4" });
    }
  }

  // Pick an H.264 config the platform can actually encode at this size.
  X.pickH264 = async (w, h, fps, bitrate) => {
    if (typeof VideoEncoder === "undefined") return null;
    const codecs = ["avc1.640034", "avc1.640033", "avc1.640032", "avc1.64002A", "avc1.640028", "avc1.4D0033", "avc1.42E034", "avc1.42001f"];
    for (const codec of codecs) {
      for (const hw of ["prefer-hardware", "no-preference"]) {
        const cfg = { codec, width: w, height: h, bitrate, framerate: fps, avc: { format: "avc" }, hardwareAcceleration: hw, latencyMode: "quality" };
        try {
          const r = await VideoEncoder.isConfigSupported(cfg);
          if (r.supported) return r.config;
        } catch (_e) {
          /* try next */
        }
      }
    }
    return null;
  };

  X.Mp4Writer = class {
    constructor(config, fps) {
      this.mux = new Mp4Muxer(config.width, config.height, fps);
      this.error = null;
      this.enc = new VideoEncoder({
        output: (chunk, meta) => this.mux.add(chunk, meta),
        error: (e) => (this.error = e)
      });
      this.enc.configure(config);
      this.fps = fps;
      this.count = 0;
    }
    async addImageData(img) {
      if (this.error) throw this.error;
      const frame = new VideoFrame(img.data, {
        format: "RGBA",
        codedWidth: img.width,
        codedHeight: img.height,
        timestamp: Math.round((this.count * 1e6) / this.fps),
        duration: Math.round(1e6 / this.fps)
      });
      this.enc.encode(frame, { keyFrame: this.count % (this.fps * 2) === 0 });
      frame.close();
      this.count++;
      while (this.enc.encodeQueueSize > 6) {
        await Promise.race([new Promise((r) => this.enc.addEventListener("dequeue", r, { once: true })), U.wait(25)]);
        if (this.error) throw this.error;
      }
    }
    async finish() {
      await this.enc.flush();
      if (this.error) throw this.error;
      this.enc.close();
      return this.mux.finalize();
    }
    abort() {
      try {
        this.enc.close();
      } catch (_e) {
        /* already closed */
      }
    }
  };

  /* ---------- ZIP (store) ---------- */
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  const crc32 = (u8) => {
    let c = 0xffffffff;
    for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  X.ZipWriter = class {
    constructor() {
      this.parts = [];
      this.central = [];
      this.offset = 0;
      const d = new Date();
      this.time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
      this.date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    }
    add(name, u8) {
      const nameBytes = new TextEncoder().encode(name);
      const crc = crc32(u8);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true);
      lh.setUint16(4, 20, true);
      lh.setUint16(6, 0x0800, true);
      lh.setUint16(8, 0, true);
      lh.setUint16(10, this.time, true);
      lh.setUint16(12, this.date, true);
      lh.setUint32(14, crc, true);
      lh.setUint32(18, u8.length, true);
      lh.setUint32(22, u8.length, true);
      lh.setUint16(26, nameBytes.length, true);
      lh.setUint16(28, 0, true);
      this.parts.push(new Uint8Array(lh.buffer), nameBytes, u8);
      this.central.push({ nameBytes, crc, size: u8.length, offset: this.offset });
      this.offset += 30 + nameBytes.length + u8.length;
    }
    finish() {
      const cd = [];
      let cdSize = 0;
      for (const f of this.central) {
        const h = new DataView(new ArrayBuffer(46));
        h.setUint32(0, 0x02014b50, true);
        h.setUint16(4, 20, true);
        h.setUint16(6, 20, true);
        h.setUint16(8, 0x0800, true);
        h.setUint16(10, 0, true);
        h.setUint16(12, this.time, true);
        h.setUint16(14, this.date, true);
        h.setUint32(16, f.crc, true);
        h.setUint32(20, f.size, true);
        h.setUint32(24, f.size, true);
        h.setUint16(28, f.nameBytes.length, true);
        h.setUint32(42, f.offset, true);
        cd.push(new Uint8Array(h.buffer), f.nameBytes);
        cdSize += 46 + f.nameBytes.length;
      }
      const end = new DataView(new ArrayBuffer(22));
      end.setUint32(0, 0x06054b50, true);
      end.setUint16(8, this.central.length, true);
      end.setUint16(10, this.central.length, true);
      end.setUint32(12, cdSize, true);
      end.setUint32(16, this.offset, true);
      return new Blob([...this.parts, ...cd, new Uint8Array(end.buffer)], { type: "application/zip" });
    }
  };

  /* ---------- SVG: grid modes (run-length paths per colour) ---------- */
  X.svgGrid = (res, pixel, scale, sourceAlpha) => {
    const { idx, pal, w, h, knock } = res;
    const counts = new Uint32Array(pal.rgb.length);
    for (let i = 0; i < idx.length; i++) counts[idx[i]]++;
    let bgIdx = -1;
    if (knock < 0 && !sourceAlpha) {
      bgIdx = 0;
      counts.forEach((c, i) => c > counts[bgIdx] && (bgIdx = i));
    }
    const paths = new Map();
    for (let y = 0; y < h; y++) {
      let x = 0;
      while (x < w) {
        const i = y * w + x;
        const k = idx[i];
        const visible = !sourceAlpha || sourceAlpha[i] >= 0.5;
        let run = 1;
        while (x + run < w && idx[i + run] === k && (!sourceAlpha || sourceAlpha[i + run] >= 0.5) === visible) run++;
        if (visible && k !== bgIdx && k !== knock) paths.set(k, (paths.get(k) || "") + `M${x} ${y}h${run}v1h-${run}z`);
        x += run;
      }
    }
    const W = w * pixel * scale, H = h * pixel * scale;
    const out = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">`
    ];
    if (bgIdx >= 0) out.push(`<rect width="${w}" height="${h}" fill="${pal.hexes[bgIdx]}"/>`);
    paths.forEach((d, k) => out.push(`<path fill="${pal.hexes[k]}" d="${d}"/>`));
    out.push("</svg>");
    return out.join("");
  };

  /* ---------- SVG: halftone dot plates ---------- */
  X.svgHalftone = (P, toneRGBA, toneW, toneH, s, scale) => {
    const { outW: W, outH: H, cellPx: cell } = P;
    // cell-resolution sampler (area-averaged via canvas downscale)
    const src = document.createElement("canvas");
    src.width = toneW;
    src.height = toneH;
    src.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(toneRGBA), toneW, toneH), 0, 0);
    const sw = Math.max(2, Math.round((W / cell) * 1.5));
    const sh = Math.max(2, Math.round((H / cell) * 1.5));
    const small = document.createElement("canvas");
    small.width = sw;
    small.height = sh;
    const sctx = small.getContext("2d", { willReadFrequently: true });
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = "high";
    sctx.drawImage(src, 0, 0, sw, sh);
    const sd = sctx.getImageData(0, 0, sw, sh).data;
    const sample = (x, y) => {
      const fx = U.clamp((x / W) * sw - 0.5, 0, sw - 1), fy = U.clamp((y / H) * sh - 0.5, 0, sh - 1);
      const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(sw - 1, x0 + 1), y1 = Math.min(sh - 1, y0 + 1);
      const tx = fx - x0, ty = fy - y0;
      const px = (xx, yy, c) => sd[(yy * sw + xx) * 4 + c] / 255;
      return [0, 1, 2, 3].map((c) => U.lerp(U.lerp(px(x0, y0, c), px(x1, y0, c), tx), U.lerp(px(x0, y1, c), px(x1, y1, c), tx), ty));
    };
    const gcr = P.gcr;
    const cmykOf = (r, g, b) => {
      const k = 1 - Math.max(r, g, b);
      const kk = k * gcr;
      const d = Math.max(1 - kk, 1e-4);
      return [U.clamp01((1 - r - kk) / d), U.clamp01((1 - g - kk) / d), U.clamp01((1 - b - kk) / d), kk];
    };
    const gain = (c) => U.clamp01(c + P.gain * c * (1 - c) * 2);
    const shape = E.SPOTS[P.shape] || "round";
    const hex3 = (v) => U.rgbToHex(v.map((c) => c * 255));
    const plates = P.cmyk
      ? [0, 1, 2, 3].map((i) => ({ ch: i, ang: P.angles[i], op: P.opac[i], dx: P.offX[i], dy: P.offY[i], ink: hex3(P.inks[i]) }))
      : [{ ch: -1, ang: P.angles[0], op: P.opac[0], dx: P.offX[0], dy: P.offY[0], ink: hex3(P.inks[3]) }];
    const f2 = (v) => Math.round(v * 100) / 100;
    const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W * scale}" height="${H * scale}" viewBox="0 0 ${W} ${H}">`];
    if (P.paper[3] > 0.5) out.push(`<rect width="${W}" height="${H}" fill="${hex3(P.paper.slice(0, 3))}"/>`);
    for (const pl of plates) {
      if (pl.op <= 0) continue;
      const cs = Math.cos(pl.ang), sn = Math.sin(pl.ang);
      const corners = [[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => {
        const qx = x - pl.dx, qy = y - pl.dy;
        return [(cs * qx + sn * qy) / cell, (-sn * qx + cs * qy) / cell];
      });
      const u0 = Math.floor(Math.min(...corners.map((c) => c[0]))) - 1, u1 = Math.ceil(Math.max(...corners.map((c) => c[0]))) + 1;
      const v0 = Math.floor(Math.min(...corners.map((c) => c[1]))) - 1, v1 = Math.ceil(Math.max(...corners.map((c) => c[1]))) + 1;
      const deg = (pl.ang * 180) / Math.PI;
      const els = [];
      for (let v = v0; v <= v1; v++) {
        for (let u = u0; u <= u1; u++) {
          const cu = (u + 0.5) * cell, cv = (v + 0.5) * cell;
          const x = cs * cu - sn * cv + pl.dx, y = sn * cu + cs * cv + pl.dy;
          if (x < -cell || y < -cell || x > W + cell || y > H + cell) continue;
          const t = sample(U.clamp(x, 0, W), U.clamp(y, 0, H));
          if (t[3] < 0.5) continue;
          let c = pl.ch < 0 ? 1 - t[0] : cmykOf(t[0], t[1], t[2])[pl.ch];
          c = gain(c);
          if (c < 0.004) continue;
          const A = c * cell * cell;
          if (shape === "round" || shape === "euclid") {
            els.push(`<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(Math.sqrt(A / Math.PI))}"/>`);
          } else if (shape === "ellipse") {
            const k = Math.sqrt(A / (Math.PI * Math.sqrt(1 / (0.72 * 1.38))));
            els.push(`<ellipse cx="${f2(x)}" cy="${f2(y)}" rx="${f2(k / Math.sqrt(0.72))}" ry="${f2(k / Math.sqrt(1.38))}" transform="rotate(${f2(deg)} ${f2(x)} ${f2(y)})"/>`);
          } else if (shape === "line") {
            const hgt = c * cell;
            els.push(`<rect x="${f2(x - cell / 2)}" y="${f2(y - hgt / 2)}" width="${f2(cell + 0.02)}" height="${f2(hgt)}" transform="rotate(${f2(deg)} ${f2(x)} ${f2(y)})"/>`);
          } else {
            const side = Math.sqrt(A);
            const rot = shape === "diamond" ? deg + 45 : deg;
            els.push(`<rect x="${f2(x - side / 2)}" y="${f2(y - side / 2)}" width="${f2(side)}" height="${f2(side)}" transform="rotate(${f2(rot)} ${f2(x)} ${f2(y)})"/>`);
          }
        }
      }
      const blend = P.cmyk ? ' style="mix-blend-mode:multiply"' : "";
      out.push(`<g fill="${pl.ink}" fill-opacity="${f2(pl.op)}"${blend}>${els.join("")}</g>`);
    }
    out.push("</svg>");
    return out.join("");
  };

  /* ---------- SVG: ASCII ---------- */
  X.svgAscii = (asc, cellW, cellH, font, weight, bgHex, transparent, scale) => {
    const W = asc.cols * cellW, H = asc.rows * cellH;
    const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W * scale}" height="${H * scale}" viewBox="0 0 ${W} ${H}">`];
    if (!transparent) out.push(`<rect width="${W}" height="${H}" fill="${bgHex}"/>`);
    out.push(
      `<g font-family="${U.escapeXml(font)}, Menlo, monospace" font-weight="${weight === "bold" ? 700 : 400}" font-size="${(cellH * 0.9).toFixed(2)}" dominant-baseline="central" xml:space="preserve">`
    );
    for (let y = 0; y < asc.rows; y++) {
      const line = asc.lines[y] || "";
      if (!line.trim()) continue;
      const spans = [];
      let run = "", runColor = null, runStart = 0;
      const flush = (x) => {
        if (run && run.trim())
          spans.push(
            `<tspan x="${runStart * cellW}" textLength="${run.length * cellW}" lengthAdjust="spacing" fill="${runColor}">${U.escapeXml(run)}</tspan>`
          );
        run = "";
        runStart = x;
      };
      for (let x = 0; x < line.length; x++) {
        const o = (y * asc.cols + x) * 4;
        const col = U.rgbToHex([asc.data[o], asc.data[o + 1], asc.data[o + 2]]);
        if (col !== runColor) {
          flush(x);
          runColor = col;
        }
        run += line[x];
      }
      flush(line.length);
      if (spans.length)
        out.push(`<text y="${(y + 0.54) * cellH}">${spans.join("")}</text>`);
    }
    out.push("</g></svg>");
    return out.join("");
  };
})();
