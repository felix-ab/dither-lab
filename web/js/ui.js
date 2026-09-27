/* Dither Lab — control widgets (sliders, curve, palette, segmented, menus). */
(() => {
  const DL = window.DL;
  const U = DL.util;
  const ui = (DL.ui = {});

  const el = (ui.el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (k === "style" && typeof v === "object") Object.assign(n.style, v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return n;
  });

  const decimals = (step) => {
    const s = String(step);
    return s.includes(".") ? s.split(".")[1].length : 0;
  };

  /* ---------- Slider ---------- */
  ui.Slider = class {
    constructor(o) {
      this.o = o;
      this.min = o.min;
      this.max = o.max;
      this.step = o.step || 1;
      this.def = o.default ?? o.min;
      this.value = o.value ?? this.def;
      this.fmt = o.format || ((v) => v.toFixed(decimals(this.step)));
      this.fill = el("div", { class: "sl-fill" });
      this.thumb = el("div", { class: "sl-thumb" });
      this.track = el("div", { class: "sl-track", role: "slider", tabindex: "-1", "aria-label": o.label }, el("div", { class: "sl-rail" }, this.fill), this.thumb);
      if (o.gradient) this.track.querySelector(".sl-rail").style.background = o.gradient;
      if (o.bipolar) this.track.classList.add("bipolar");
      this.label = el("label", { class: "sl-label", title: o.hint ? `${o.hint}\nDrag to scrub · double-click to reset` : "Drag to scrub · double-click to reset" }, o.label);
      this.input = el("input", { class: "sl-value", type: "text", inputmode: "decimal", spellcheck: "false", "aria-label": `${o.label} value` });
      this.el = el("div", { class: "row slider" }, this.label, this.track, this.input);
      this._bind();
      this.render();
    }
    _q(v) {
      const s = this.step;
      v = Math.round((v - this.min) / s) * s + this.min;
      return U.clamp(+v.toFixed(6), this.min, this.max);
    }
    set(v, silent = true) {
      this.value = this._q(v);
      this.render();
      if (!silent) this.o.onInput && this.o.onInput(this.value);
    }
    render() {
      const t = (this.value - this.min) / (this.max - this.min || 1);
      if (this.o.bipolar) {
        const zeroT = U.clamp01(((this.o.zero ?? 0) - this.min) / (this.max - this.min || 1));
        this.fill.style.left = `${Math.min(t, zeroT) * 100}%`;
        this.fill.style.width = `${Math.abs(t - zeroT) * 100}%`;
      } else {
        this.fill.style.left = "0";
        this.fill.style.width = `${t * 100}%`;
      }
      this.thumb.style.left = `${t * 100}%`;
      if (document.activeElement !== this.input) this.input.value = this.fmt(this.value);
      this.el.classList.toggle("changed", Math.abs(this.value - this.def) > 1e-9);
      this.track.setAttribute("aria-valuenow", this.value);
    }
    setDisabled(d) {
      this.el.classList.toggle("disabled", !!d);
    }
    _commit(prev) {
      if (this.value !== prev) this.o.onCommit && this.o.onCommit(this.value, prev);
    }
    _bind() {
      let prev = 0, lastX = 0, dragging = false;
      const fromX = (x) => {
        const r = this.track.getBoundingClientRect();
        return this.min + U.clamp01((x - r.left) / r.width) * (this.max - this.min);
      };
      this.track.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        this.track.setPointerCapture(e.pointerId);
        dragging = true;
        prev = this.value;
        lastX = e.clientX;
        this.el.classList.add("active");
        if (!(e.shiftKey || e.altKey)) this.set(fromX(e.clientX), false);
      });
      this.track.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        if (e.shiftKey || e.altKey) {
          const r = this.track.getBoundingClientRect();
          const raw = this.value + ((e.clientX - lastX) / r.width) * (this.max - this.min) * 0.1;
          this.value = U.clamp(raw, this.min, this.max);
          this.set(this.value, false);
        } else this.set(fromX(e.clientX), false);
        lastX = e.clientX;
      });
      const end = () => {
        if (!dragging) return;
        dragging = false;
        this.el.classList.remove("active");
        this._commit(prev);
      };
      this.track.addEventListener("pointerup", end);
      this.track.addEventListener("pointercancel", end);
      this.track.addEventListener("dblclick", () => this.reset());
      // scrubby label
      let lp = null;
      this.label.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        this.label.setPointerCapture(e.pointerId);
        lp = { x: e.clientX, moved: 0, prev: this.value, acc: this.value };
        this.el.classList.add("active");
      });
      this.label.addEventListener("pointermove", (e) => {
        if (!lp) return;
        const dx = e.clientX - lp.x;
        lp.x = e.clientX;
        lp.moved += Math.abs(dx);
        const k = (e.shiftKey || e.altKey ? 0.1 : 1) * ((this.max - this.min) / 220);
        lp.acc = U.clamp(lp.acc + dx * k, this.min, this.max);
        this.set(lp.acc, false);
      });
      const lend = () => {
        if (!lp) return;
        const p = lp.prev;
        lp = null;
        this.el.classList.remove("active");
        this._commit(p);
      };
      this.label.addEventListener("pointerup", lend);
      this.label.addEventListener("pointercancel", lend);
      this.label.addEventListener("dblclick", () => this.reset());
      // typed value
      this.input.addEventListener("focus", () => requestAnimationFrame(() => this.input.select()));
      this.input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.input.blur();
        } else if (e.key === "Escape") {
          this.input.value = this.fmt(this.value);
          this.input.blur();
        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          const p = this.value;
          const mult = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
          this.set(this.value + (e.key === "ArrowUp" ? 1 : -1) * this.step * mult, false);
          this.input.value = this.fmt(this.value);
          this._commit(p);
        }
        e.stopPropagation();
      });
      this.input.addEventListener("blur", () => {
        const raw = this.o.parse ? this.o.parse(this.input.value) : Number.parseFloat(this.input.value.replace(/[^\d.+-]/g, ""));
        if (Number.isFinite(raw)) {
          const p = this.value;
          this.set(raw, false);
          this._commit(p);
        }
        this.input.value = this.fmt(this.value);
      });
    }
    reset() {
      const p = this.value;
      this.set(this.def, false);
      this._commit(p);
    }
  };

  /* ---------- Toggle switch ---------- */
  ui.Switch = class {
    constructor(o) {
      this.o = o;
      this.value = !!o.value;
      this.btn = el("button", { class: "switch", type: "button", role: "switch", "aria-label": o.label, title: o.hint || o.label }, el("span"));
      this.btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.value = !this.value;
        this.render();
        o.onCommit && o.onCommit(this.value, !this.value);
      });
      this.el = o.bare ? this.btn : el("div", { class: "row toggle" }, el("span", { class: "sl-label plain", title: o.hint || "" }, o.label), this.btn);
      this.render();
    }
    set(v) {
      this.value = !!v;
      this.render();
    }
    render() {
      this.btn.setAttribute("aria-checked", String(this.value));
    }
    setDisabled(d) {
      this.el.classList.toggle("disabled", !!d);
    }
  };

  /* ---------- Segmented ---------- */
  ui.Seg = class {
    constructor(o) {
      this.o = o;
      this.value = o.value;
      this.buttons = o.options.map((opt) => {
        const b = el("button", { type: "button", class: "seg-btn", title: opt.hint || opt.label, "data-v": String(opt.value) }, opt.icon ? el("span", { class: "seg-ico", html: opt.icon }) : null, opt.short || opt.label);
        b.addEventListener("click", () => {
          const prev = this.value;
          if (prev === opt.value) return;
          this.value = opt.value;
          this.render();
          o.onCommit && o.onCommit(opt.value, prev);
        });
        return b;
      });
      this.group = el("div", { class: `seg ${o.wrap ? "wrap" : ""} ${o.cols ? "cols" : ""}`, style: o.cols ? { gridTemplateColumns: `repeat(${o.cols}, 1fr)` } : null }, this.buttons);
      this.el = o.label ? el("div", { class: "row seg-row" }, el("span", { class: "sl-label plain" }, o.label), this.group) : this.group;
      this.render();
    }
    set(v) {
      this.value = v;
      this.render();
    }
    render() {
      this.buttons.forEach((b) => b.classList.toggle("on", b.dataset.v === String(this.value)));
    }
    setDisabled(d) {
      this.el.classList.toggle("disabled", !!d);
    }
  };

  /* ---------- Select ---------- */
  ui.Select = class {
    constructor(o) {
      this.o = o;
      this.sel = el("select", { class: "select", "aria-label": o.label }, o.options.map((opt) => el("option", { value: String(opt.value) }, opt.label)));
      this.sel.addEventListener("change", () => {
        const prev = this.value;
        const opt = o.options.find((x) => String(x.value) === this.sel.value);
        this.value = opt ? opt.value : this.sel.value;
        o.onCommit && o.onCommit(this.value, prev);
      });
      this.el = el("div", { class: "row select-row" }, el("span", { class: "sl-label plain" }, o.label), this.sel);
      this.set(o.value);
    }
    set(v) {
      this.value = v;
      this.sel.value = String(v);
    }
    setDisabled(d) {
      this.el.classList.toggle("disabled", !!d);
    }
  };

  /* ---------- Colour field ---------- */
  ui.ColorField = class {
    constructor(o) {
      this.o = o;
      this.value = U.normalizeHex(o.value || "#000000");
      this.picker = el("input", { type: "color", class: "cf-picker", "aria-label": o.label });
      this.hex = el("input", { type: "text", class: "cf-hex", spellcheck: "false", maxlength: "7", "aria-label": `${o.label} hex` });
      let prev = this.value;
      this.picker.addEventListener("focus", () => (prev = this.value));
      this.picker.addEventListener("input", () => {
        this.value = this.picker.value;
        this.hex.value = this.value;
        o.onInput && o.onInput(this.value);
      });
      this.picker.addEventListener("change", () => {
        o.onCommit && o.onCommit(this.value, prev);
        prev = this.value;
      });
      this.hex.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") this.hex.blur();
      });
      this.hex.addEventListener("blur", () => {
        if (U.isHex(this.hex.value)) {
          const p = this.value;
          this.value = U.normalizeHex(this.hex.value.startsWith("#") ? this.hex.value : "#" + this.hex.value);
          this.render();
          if (p !== this.value) {
            o.onInput && o.onInput(this.value);
            o.onCommit && o.onCommit(this.value, p);
          }
        } else this.render();
      });
      const well = el("span", { class: "cf-well" }, this.picker);
      this.el = el("div", { class: "row color-row" }, el("span", { class: "sl-label plain" }, o.label), el("div", { class: "cf" }, well, this.hex));
      this.well = well;
      this.render();
    }
    set(v) {
      this.value = U.normalizeHex(v);
      this.render();
    }
    render() {
      this.picker.value = this.value;
      this.hex.value = this.value;
      this.well.style.background = this.value;
    }
    setDisabled(d) {
      this.el.classList.toggle("disabled", !!d);
    }
  };

  /* ---------- Scrub number (compact, for tables) ---------- */
  ui.Scrub = class {
    constructor(o) {
      this.o = o;
      this.value = o.value ?? 0;
      this.step = o.step || 1;
      this.inp = el("input", { class: "scrub", type: "text", inputmode: "decimal", spellcheck: "false", title: `${o.label || ""} — drag to scrub, double-click to reset` });
      let st = null;
      this.inp.addEventListener("pointerdown", (e) => {
        if (document.activeElement === this.inp) return;
        e.preventDefault();
        this.inp.setPointerCapture(e.pointerId);
        st = { x: e.clientX, moved: 0, acc: this.value, prev: this.value };
      });
      this.inp.addEventListener("pointermove", (e) => {
        if (!st) return;
        const dx = e.clientX - st.x;
        st.x = e.clientX;
        st.moved += Math.abs(dx);
        st.acc = U.clamp(st.acc + dx * (o.perPx || this.step) * (e.shiftKey ? 0.1 : 1), o.min, o.max);
        this.value = +(Math.round(st.acc / this.step) * this.step).toFixed(4);
        this.render();
        o.onInput && o.onInput(this.value);
      });
      this.inp.addEventListener("pointerup", () => {
        if (!st) return;
        const s = st;
        st = null;
        if (s.moved < 3) {
          this.inp.focus();
          return;
        }
        if (this.value !== s.prev) o.onCommit && o.onCommit(this.value, s.prev);
      });
      this.inp.addEventListener("dblclick", () => {
        const p = this.value;
        this.value = o.default ?? 0;
        this.render();
        o.onInput && o.onInput(this.value);
        o.onCommit && o.onCommit(this.value, p);
      });
      this.inp.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") this.inp.blur();
      });
      this.inp.addEventListener("blur", () => {
        const v = Number.parseFloat(this.inp.value);
        if (Number.isFinite(v)) {
          const p = this.value;
          this.value = U.clamp(v, o.min, o.max);
          if (p !== this.value) {
            o.onInput && o.onInput(this.value);
            o.onCommit && o.onCommit(this.value, p);
          }
        }
        this.render();
      });
      this.el = this.inp;
      this.render();
    }
    set(v) {
      this.value = v;
      this.render();
    }
    render() {
      if (document.activeElement !== this.inp) this.inp.value = this.o.format ? this.o.format(this.value) : String(this.value);
    }
  };

  /* ---------- Popup menu ---------- */
  ui.menu = (anchor, items, onPick) => {
    document.querySelectorAll(".menu").forEach((m) => m.remove());
    const m = el("div", { class: "menu", role: "menu" });
    items.forEach((it) => {
      if (it.sep) {
        m.append(el("div", { class: "menu-sep" }, it.label || ""));
        return;
      }
      const b = el("button", { type: "button", class: "menu-item", role: "menuitem" }, it.swatches ? el("span", { class: "menu-sw" }, it.swatches.map((c) => el("i", { style: { background: c } }))) : null, el("span", { class: "menu-lbl" }, it.label), it.hint ? el("span", { class: "menu-hint" }, it.hint) : null);
      b.addEventListener("click", () => {
        m.remove();
        onPick(it);
      });
      m.append(b);
    });
    document.body.append(m);
    const r = anchor.getBoundingClientRect();
    const mh = Math.min(m.scrollHeight, window.innerHeight - 24);
    let top = r.bottom + 4;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 4);
    m.style.top = `${top}px`;
    m.style.left = `${Math.max(8, Math.min(window.innerWidth - m.offsetWidth - 8, r.left))}px`;
    m.style.maxHeight = `${window.innerHeight - 24}px`;
    const close = (e) => {
      if (!m.contains(e.target) && e.target !== anchor) {
        m.remove();
        document.removeEventListener("pointerdown", close, true);
      }
    };
    setTimeout(() => document.addEventListener("pointerdown", close, true));
    const esc = (e) => {
      if (e.key === "Escape") {
        m.remove();
        document.removeEventListener("keydown", esc, true);
      }
    };
    document.addEventListener("keydown", esc, true);
    const first = m.querySelector(".menu-item");
    first && first.focus();
    return m;
  };

  /* ---------- Tone curve ---------- */
  ui.CurveEditor = class {
    constructor(o) {
      this.o = o;
      this.points = U.deepClone(o.value || [[0, 0], [1, 1]]);
      this.hist = null;
      this.canvas = el("canvas", { class: "curve-canvas", "aria-label": "Tone curve. Click to add a point, drag to shape, double-click a point to remove it." });
      this.readout = el("span", { class: "curve-readout" }, "");
      this.el = el("div", { class: "curve" }, this.canvas, this.readout);
      this.active = -1;
      this.hover = -1;
      this.size = { w: 0, h: 0 };
      this._raf = 0;
      this._bind();
      new ResizeObserver((entries) => {
        const r = entries[0].contentRect;
        this.size = { w: r.width, h: r.height };
        this.draw();
      }).observe(this.canvas);
    }
    set(pts) {
      this.points = U.deepClone(pts);
      this.draw();
    }
    setHistogram(h) {
      this.hist = h;
      if (!this._raf) this._raf = requestAnimationFrame(() => ((this._raf = 0), this.draw()));
    }
    _geom() {
      const r = this.canvas.getBoundingClientRect();
      const pad = 8;
      return { r, pad, w: r.width - pad * 2, h: r.height - pad * 2 };
    }
    _toPx(p) {
      const g = this._geom();
      return [g.pad + p[0] * g.w, g.pad + (1 - p[1]) * g.h];
    }
    _fromEvt(e) {
      const g = this._geom();
      return [U.clamp01((e.clientX - g.r.left - g.pad) / g.w), (1 - (e.clientY - g.r.top - g.pad) / g.h)];
    }
    _hit(e) {
      const g = this._geom();
      const mx = e.clientX - g.r.left, my = e.clientY - g.r.top;
      let best = -1, bd = 10;
      this.points.forEach((p, i) => {
        const [px, py] = this._toPx(p);
        const d = Math.hypot(px - mx, py - my);
        if (d < bd) (bd = d), (best = i);
      });
      return best;
    }
    _bind() {
      let prev = null, dragIdx = -1;
      this.canvas.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        this.canvas.setPointerCapture(e.pointerId);
        prev = U.deepClone(this.points);
        let i = this._hit(e);
        if (i < 0) {
          const [x] = this._fromEvt(e);
          const lut = U.curveLUT(this.points, 256);
          const y = lut[Math.round(x * 255)];
          this.points.push([x, y]);
          this.points.sort((a, b) => a[0] - b[0]);
          i = this.points.findIndex((p) => p[0] === x);
        }
        dragIdx = i;
        this.active = i;
        this._move(e, dragIdx);
      });
      this.canvas.addEventListener("pointermove", (e) => {
        if (dragIdx < 0) {
          const h = this._hit(e);
          if (h !== this.hover) {
            this.hover = h;
            this.draw();
          }
          const [x] = this._fromEvt(e);
          const lut = U.curveLUT(this.points, 256);
          this.readout.textContent = `${Math.round(x * 255)} → ${Math.round(lut[Math.round(x * 255)] * 255)}`;
          return;
        }
        this._move(e, dragIdx);
      });
      const end = () => {
        if (dragIdx < 0) return;
        const p = this.points[dragIdx];
        const last = this.points.length - 1;
        if (p && p._out && dragIdx !== 0 && dragIdx !== last) this.points.splice(dragIdx, 1);
        this.points.forEach((q) => delete q._out);
        dragIdx = -1;
        this.active = -1;
        this.draw();
        this.o.onInput && this.o.onInput(this.points.map((q) => [q[0], q[1]]));
        if (JSON.stringify(prev) !== JSON.stringify(this.points)) this.o.onCommit && this.o.onCommit(this.points.map((q) => [q[0], q[1]]), prev);
      };
      this.canvas.addEventListener("pointerup", end);
      this.canvas.addEventListener("pointercancel", end);
      this.canvas.addEventListener("pointerleave", () => {
        if (dragIdx < 0) {
          this.hover = -1;
          this.readout.textContent = "";
          this.draw();
        }
      });
      this.canvas.addEventListener("dblclick", (e) => {
        const i = this._hit(e);
        const prev2 = U.deepClone(this.points);
        if (i > 0 && i < this.points.length - 1) this.points.splice(i, 1);
        else if (i < 0) this.points = [[0, 0], [1, 1]];
        else return;
        this.draw();
        this.o.onInput && this.o.onInput(this.points);
        this.o.onCommit && this.o.onCommit(this.points, prev2);
      });
    }
    _move(e, i) {
      const [x, y0] = this._fromEvt(e);
      const out = y0 < -0.12 || y0 > 1.12;
      const y = U.clamp01(y0);
      const n = this.points.length;
      const lo = i === 0 ? 0 : this.points[i - 1][0] + 0.01;
      const hi = i === n - 1 ? 1 : this.points[i + 1][0] - 0.01;
      const p = this.points[i];
      p[0] = U.clamp(x, lo, hi);
      p[1] = y;
      p._out = out && i !== 0 && i !== n - 1;
      this.readout.textContent = p._out ? "release to remove" : `${Math.round(p[0] * 255)} → ${Math.round(p[1] * 255)}`;
      this.draw();
      const pts = this.points.filter((q) => !q._out).map((q) => [q[0], q[1]]);
      this.o.onInput && this.o.onInput(pts);
    }
    draw() {
      const c = this.canvas;
      const dpr = window.devicePixelRatio || 1;
      const r = { width: this.size.w, height: this.size.h };
      if (!r.width) return;
      if (c.width !== Math.round(r.width * dpr) || c.height !== Math.round(r.height * dpr)) {
        c.width = Math.round(r.width * dpr);
        c.height = Math.round(r.height * dpr);
      }
      const ctx = c.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, r.width, r.height);
      const pad = 8, w = r.width - pad * 2, h = r.height - pad * 2;
      if (!this.colors) {
        const css = getComputedStyle(document.documentElement);
        const v = (n, d) => css.getPropertyValue(n).trim() || d;
        this.colors = { line: v("--line", "#333"), hist: v("--hist", "#555"), text: v("--text", "#ddd"), panel: v("--panel", "#222") };
      }
      const { line, hist: muted, text } = this.colors;
      // histogram
      if (this.hist) {
        let max = 0;
        for (const v of this.hist) max = Math.max(max, v);
        if (max > 0) {
          ctx.fillStyle = muted;
          ctx.beginPath();
          ctx.moveTo(pad, pad + h);
          const n = this.hist.length;
          for (let i = 0; i < n; i++) {
            const v = Math.sqrt(this.hist[i] / max);
            ctx.lineTo(pad + ((i + 0.5) / n) * w, pad + h - v * h * 0.9);
          }
          ctx.lineTo(pad + w, pad + h);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.strokeStyle = line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < 4; i++) {
        ctx.moveTo(pad + (w * i) / 4 + 0.5, pad);
        ctx.lineTo(pad + (w * i) / 4 + 0.5, pad + h);
        ctx.moveTo(pad, pad + (h * i) / 4 + 0.5);
        ctx.lineTo(pad + w, pad + (h * i) / 4 + 0.5);
      }
      ctx.stroke();
      ctx.strokeRect(pad + 0.5, pad + 0.5, w - 1, h - 1);
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(pad, pad + h);
      ctx.lineTo(pad + w, pad);
      ctx.stroke();
      ctx.setLineDash([]);
      const pts = this.points.filter((q) => !q._out);
      const lut = U.curveLUT(pts, 256);
      ctx.strokeStyle = text;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 256; i++) {
        const x = pad + (i / 255) * w, y = pad + (1 - lut[i]) * h;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      this.points.forEach((p, i) => {
        const [x, y] = [pad + p[0] * w, pad + (1 - p[1]) * h];
        ctx.beginPath();
        ctx.arc(x, y, i === this.active || i === this.hover ? 4.5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = p._out ? "transparent" : i === this.active ? text : this.colors.panel;
        ctx.fill();
        ctx.strokeStyle = text;
        ctx.lineWidth = 1.25;
        ctx.stroke();
      });
    }
  };

  /* ---------- OKLCH mini editor ---------- */
  ui.OklchEditor = class {
    constructor(o) {
      this.o = o;
      this.hex = "#808080";
      const mk = (label, min, max, step, fmt) =>
        new ui.Slider({
          label, min, max, step, default: min, format: fmt,
          onInput: () => this._emit(false),
          onCommit: () => this._emit(true)
        });
      this.L = mk("L", 0, 1, 0.001, (v) => v.toFixed(3));
      this.C = mk("C", 0, 0.37, 0.001, (v) => v.toFixed(3));
      this.H = mk("H", 0, 360, 0.5, (v) => `${v.toFixed(1)}°`);
      this.el = el("div", { class: "oklch" }, this.L.el, this.C.el, this.H.el);
    }
    set(hex) {
      this.hex = hex;
      const [L, C, H] = U.hexToOklch(hex);
      this.L.set(L);
      this.C.set(C);
      if (C > 0.002) this.H.set(H);
      this._tracks();
    }
    _tracks() {
      const L = this.L.value, C = this.C.value, H = this.H.value;
      const grad = (fn, n = 12) => `linear-gradient(90deg, ${Array.from({ length: n + 1 }, (_, i) => fn(i / n)).join(",")})`;
      this.L.track.querySelector(".sl-rail").style.background = grad((t) => U.oklchToHex(t, C, H));
      this.C.track.querySelector(".sl-rail").style.background = grad((t) => U.oklchToHex(L, t * 0.37, H));
      this.H.track.querySelector(".sl-rail").style.background = grad((t) => U.oklchToHex(L, Math.max(C, 0.06), t * 360), 18);
    }
    _emit(commit) {
      this.hex = U.oklchToHex(this.L.value, this.C.value, this.H.value);
      this._tracks();
      commit ? this.o.onCommit && this.o.onCommit(this.hex) : this.o.onInput && this.o.onInput(this.hex);
    }
  };

  /* ---------- Palette strip ---------- */
  ui.PaletteEditor = class {
    constructor(o) {
      this.o = o;
      this.colors = (o.value || []).slice();
      this.sel = 0;
      this.strip = el("div", { class: "pal-strip", role: "listbox", "aria-label": "Palette, shadows to highlights" });
      this.addBtn = el("button", { type: "button", class: "pal-add", title: "Add colour" }, "+");
      this.addBtn.addEventListener("click", () => {
        const prev = this.colors.slice();
        const a = this.colors[this.sel] || "#808080";
        const b = this.colors[this.sel + 1];
        const mid = b ? U.rampOklab([a, b], 3)[1] : a;
        this.colors.splice(this.sel + 1, 0, mid);
        this.sel += 1;
        this._changed(prev);
      });
      this.picker = el("input", { type: "color", class: "pal-picker", tabindex: "-1", "aria-hidden": "true" });
      let pickPrev = null;
      this.picker.addEventListener("input", () => {
        if (!pickPrev) pickPrev = this.colors.slice();
        this.colors[this.sel] = this.picker.value;
        this.render();
        this.o.onInput && this.o.onInput(this.colors.slice());
      });
      this.picker.addEventListener("change", () => {
        if (pickPrev) this._changed(pickPrev, true);
        pickPrev = null;
      });
      this.hexIn = el("input", { type: "text", class: "cf-hex", spellcheck: "false", maxlength: "7", "aria-label": "Selected colour hex" });
      this.hexIn.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") this.hexIn.blur();
      });
      this.hexIn.addEventListener("blur", () => {
        if (!U.isHex(this.hexIn.value)) return this.render();
        const h = U.normalizeHex(this.hexIn.value.startsWith("#") ? this.hexIn.value : "#" + this.hexIn.value);
        if (h === this.colors[this.sel]) return;
        const prev = this.colors.slice();
        this.colors[this.sel] = h;
        this._changed(prev);
      });
      let okPrev = null;
      this.oklch = new ui.OklchEditor({
        onInput: (hex) => {
          if (!okPrev) okPrev = this.colors.slice();
          this.colors[this.sel] = hex;
          this.render(true);
          this.o.onInput && this.o.onInput(this.colors.slice());
        },
        onCommit: (hex) => {
          const prev = okPrev || this.colors.slice();
          okPrev = null;
          this.colors[this.sel] = hex;
          this._changed(prev, true);
        }
      });
      this.well = el("button", { type: "button", class: "cf-well big", title: "Open colour picker" });
      this.well.addEventListener("click", () => this.picker.click());
      this.delBtn = el("button", { type: "button", class: "icon-btn", title: "Remove colour (Delete)" }, "Remove");
      this.delBtn.addEventListener("click", () => this.remove(this.sel));
      this.detail = el("div", { class: "pal-detail" }, el("div", { class: "pal-detail-top" }, this.well, this.picker, this.hexIn, el("span", { class: "grow" }), this.delBtn), this.oklch.el);
      this.el = el("div", { class: "pal" }, el("div", { class: "pal-row" }, this.strip, this.addBtn), this.detail);
      this.render();
    }
    set(colors) {
      this.colors = colors.slice();
      this.sel = Math.min(this.sel, this.colors.length - 1);
      this.render();
    }
    remove(i) {
      if (this.colors.length <= 2) return;
      const prev = this.colors.slice();
      this.colors.splice(i, 1);
      this.sel = Math.max(0, Math.min(this.sel, this.colors.length - 1));
      this._changed(prev);
    }
    _changed(prev, skipOklch) {
      this.render(skipOklch);
      this.o.onInput && this.o.onInput(this.colors.slice());
      this.o.onCommit && this.o.onCommit(this.colors.slice(), prev);
    }
    render(skipOklch) {
      this.strip.textContent = "";
      this.colors.forEach((c, i) => {
        const sw = el("button", { type: "button", class: `pal-sw ${i === this.sel ? "sel" : ""}`, role: "option", "aria-selected": String(i === this.sel), title: `${c} — drag to reorder, double-click to pick`, style: { background: c } });
        let down = null;
        sw.addEventListener("pointerdown", (e) => {
          if (e.button !== 0) return;
          down = { x: e.clientX, i, moved: false };
          sw.setPointerCapture(e.pointerId);
        });
        sw.addEventListener("pointermove", (e) => {
          if (!down) return;
          if (Math.abs(e.clientX - down.x) > 4) down.moved = true;
          if (!down.moved) return;
          const kids = [...this.strip.children];
          const over = kids.findIndex((k) => {
            const r = k.getBoundingClientRect();
            return e.clientX >= r.left && e.clientX < r.right;
          });
          if (over >= 0 && over !== down.i) {
            const prev = this.colors.slice();
            const [m] = this.colors.splice(down.i, 1);
            this.colors.splice(over, 0, m);
            this.sel = over;
            down.i = over;
            down.prev = down.prev || prev;
            this.render();
            this.strip.children[over] && this.strip.children[over].setPointerCapture(e.pointerId);
            this.o.onInput && this.o.onInput(this.colors.slice());
          }
        });
        sw.addEventListener("pointerup", () => {
          if (!down) return;
          const d = down;
          down = null;
          if (!d.moved) {
            this.sel = i;
            this.render();
          } else if (d.prev) this.o.onCommit && this.o.onCommit(this.colors.slice(), d.prev);
        });
        sw.addEventListener("dblclick", () => {
          this.sel = i;
          this.render();
          this.picker.click();
        });
        sw.addEventListener("keydown", (e) => {
          if (e.key === "Delete" || e.key === "Backspace") {
            e.preventDefault();
            e.stopPropagation();
            this.remove(i);
          } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            e.stopPropagation();
            this.sel = U.clamp(this.sel + (e.key === "ArrowLeft" ? -1 : 1), 0, this.colors.length - 1);
            this.render();
            this.strip.children[this.sel].focus();
          }
        });
        this.strip.append(sw);
      });
      const c = this.colors[this.sel] || "#000000";
      this.picker.value = c;
      if (document.activeElement !== this.hexIn) this.hexIn.value = c;
      this.well.style.background = c;
      this.delBtn.disabled = this.colors.length <= 2;
      if (!skipOklch) this.oklch.set(c);
    }
  };

  /* ---------- toast ---------- */
  let toastTimer = 0;
  ui.toast = (msg, kind = "") => {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.className = `toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = "toast"), kind === "error" ? 6000 : 2600);
  };
})();
