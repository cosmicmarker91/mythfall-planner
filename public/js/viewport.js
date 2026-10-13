// Smooth wheel zoom (about the cursor), drag pan, pinch zoom, tap detection.
export class Viewport {
  constructor(viewport, content, { worldW, worldH, onTap, padTop = 90, padBottom = 50 }) {
    Object.assign(this, { vp: viewport, el: content, W: worldW, H: worldH, onTap, padTop, padBottom });
    this.cur = { x: 0, y: 0, s: 1 };
    this.tgt = { x: 0, y: 0, s: 1 };
    this.ptrs = new Map(); this.raf = 0; this.last = 0;
    this.fitScale = 1;
    viewport.addEventListener("wheel", (e) => this.#wheel(e), { passive: false });
    viewport.addEventListener("pointerdown", (e) => this.#down(e));
    viewport.addEventListener("pointermove", (e) => this.#move(e));
    viewport.addEventListener("pointerup", (e) => this.#up(e));
    viewport.addEventListener("pointercancel", (e) => this.#up(e, true));
    addEventListener("resize", () => this.#onResize());
    this.fit(false);
  }

  fit(animate = true) {
    const vw = this.vp.clientWidth, vh = this.vp.clientHeight - this.padTop - this.padBottom;
    this.fitScale = Math.min(vw / this.W, vh / this.H);
    const s = this.fitScale;
    this.#set({ s, x: (vw - this.W * s) / 2, y: this.padTop + (vh - this.H * s) / 2 }, animate);
  }
  #onResize() { // keep the same world point centered when the window changes
    const oldFit = this.fitScale;
    const vw = this.vp.clientWidth, vh = this.vp.clientHeight - this.padTop - this.padBottom;
    this.fitScale = Math.min(vw / this.W, vh / this.H);
    const ratio = this.fitScale / oldFit;
    this.tgt.s *= ratio; this.cur.s = this.tgt.s;
    this.#clamp(this.tgt); Object.assign(this.cur, this.tgt); this.#apply();
  }
  #set(t, animate) {
    Object.assign(this.tgt, t);
    if (!animate) Object.assign(this.cur, this.tgt);
    this.#apply(); this.#kick();
  }
  #clamp(t) {
    const vw = this.vp.clientWidth, vh = this.vp.clientHeight;
    t.s = Math.min(Math.max(t.s, this.fitScale * 0.6), this.fitScale * 14);
    const w = this.W * t.s, h = this.H * t.s, m = 0.2;
    t.x = Math.min(Math.max(t.x, vw * m - w), vw * (1 - m));
    t.y = Math.min(Math.max(t.y, vh * m - h), vh * (1 - m));
  }
  #apply() { this.el.style.transform = `translate(${this.cur.x}px,${this.cur.y}px) scale(${this.cur.s})`; }
  #kick() { if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame((t) => this.#tick(t)); } }
  #tick(now) {
    const dt = Math.min(now - this.last, 50); this.last = now;
    const k = 1 - Math.exp(-dt / 70), c = this.cur, t = this.tgt;
    c.x += (t.x - c.x) * k; c.y += (t.y - c.y) * k; c.s += (t.s - c.s) * k;
    const done = Math.abs(t.x - c.x) < .1 && Math.abs(t.y - c.y) < .1 && Math.abs(t.s - c.s) < t.s * 1e-4;
    if (done) Object.assign(c, t);
    this.#apply();
    this.raf = done ? 0 : requestAnimationFrame((n) => this.#tick(n));
  }
  #zoomAt(px, py, factor) {
    const t = this.tgt, wx = (px - t.x) / t.s, wy = (py - t.y) / t.s;
    t.s *= factor; this.#clamp(t); // clamp scale first so the anchor math uses the real scale
    t.x = px - wx * t.s; t.y = py - wy * t.s; this.#clamp(t);
    this.#kick();
  }
  #wheel(e) {
    e.preventDefault();
    const r = this.vp.getBoundingClientRect();
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
    this.#zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0016)));
  }
  #down(e) {
    this.vp.setPointerCapture(e.pointerId);
    this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false });
    this.pinch = this.ptrs.size === 2 ? this.#pinchState() : null;
  }
  #pinchState() { const [a, b] = [...this.ptrs.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; }
  #move(e) {
    const p = this.ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (Math.hypot(p.x - p.sx, p.y - p.sy) > 6) p.moved = true;
    if (this.ptrs.size === 2 && this.pinch) {
      const n = this.#pinchState(), r = this.vp.getBoundingClientRect();
      this.tgt.x += n.cx - this.pinch.cx; this.tgt.y += n.cy - this.pinch.cy;
      this.#zoomAt(n.cx - r.left, n.cy - r.top, n.d / this.pinch.d);
      Object.assign(this.cur, this.tgt); this.#apply(); this.pinch = n;
      for (const q of this.ptrs.values()) q.moved = true;
    } else if (p.moved && this.ptrs.size === 1) {
      this.tgt.x += dx; this.tgt.y += dy; this.#clamp(this.tgt);
      this.cur.x = this.tgt.x; this.cur.y = this.tgt.y; this.#apply();
    }
  }
  #up(e, cancelled) {
    const p = this.ptrs.get(e.pointerId); this.ptrs.delete(e.pointerId); this.pinch = null;
    if (p && !p.moved && !cancelled && this.ptrs.size === 0) this.onTap(document.elementFromPoint(e.clientX, e.clientY));
  }
}
