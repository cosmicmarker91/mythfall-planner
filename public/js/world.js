// Builds the world: background layers + one SVG overlay, all inside ONE element so they
// share a single coordinate system and transform (they cannot drift apart).
//
// Lighting model (colours sampled from the real Mythfall UI):
//   locked    -> the screenshot as-is (dim)
//   available -> unselected neighbour of a selected skill: icon lit, connecting line mid-grey
//   selected  -> icon lit + orange rim; lines between two selected skills bright
const SVG = "http://www.w3.org/2000/svg";
export const COLORS = {   // [r,g,b], sampled from the real Mythfall UI
  lineAvailable: [93, 113, 118],
  lineSelected: [200, 207, 204],
};
const GAIN = 4.35;        // dim screenshot -> lit icon (measured against a real lit screenshot)
const LINE_W = 5;         // world px, measured from the screenshots (used to size the line sprites)
const RIM_W = 3.5;        // world px
const HIT_PAD = 3;

const el = (n, attrs = {}) => { const e = document.createElementNS(SVG, n); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

function shape(s, W, H, pad) {
  const cx = s.x * W, cy = s.y * H, h = (s.size * W) / 2;
  if (s.shape === "diamond") {
    const d = h + pad * Math.SQRT2;
    return `${cx},${cy - d} ${cx + d},${cy} ${cx},${cy + d} ${cx - d},${cy}`;
  }
  const q = h + pad;
  return `${cx - q},${cy - q} ${cx + q},${cy - q} ${cx + q},${cy + q} ${cx - q},${cy + q}`;
}

export function buildWorld(root, tree) {
  const { width: W, height: H } = tree.world;
  root.style.width = W + "px";
  root.style.height = H + "px";
  root.replaceChildren();

  const sources = [];
  for (const L of tree.layers) {
    const { rect: r, clip: c } = L;
    const wrap = document.createElement("div");
    wrap.className = "layer";
    const ch = c.y1 - c.y0;
    wrap.style.top = (c.y0 * 100) + "%";
    wrap.style.height = (ch * 100) + "%";
    const img = document.createElement("img");
    img.src = L.src; img.alt = ""; img.draggable = false;
    img.style.left = (r.x * 100) + "%";
    img.style.top = (((r.y - c.y0) / ch) * 100) + "%";
    img.style.width = (r.w * 100) + "%";
    img.style.height = ((r.h / ch) * 100) + "%";
    wrap.append(img); root.append(wrap);
    sources.push({ img, L });
  }

  const svg = el("svg", { viewBox: `0 0 ${W} ${H}` });
  const gLines = el("g"), gSprites = el("g"), gRims = el("g"), gHits = el("g");
  svg.append(gLines, gSprites, gRims, gHits);

  const byId = new Map();
  for (const s of tree.skills) {
    const half = (s.size * W) / 2;
    const g = el("g", { class: "skill" }); g.dataset.id = s.id;
    const hit = el("polygon", { class: "hit", points: shape(s, W, H, HIT_PAD) });
    const title = el("title"); title.textContent = s.name; hit.append(title);
    g.append(hit); gHits.append(g);
    const rim = el("polygon", { class: "rim", points: shape(s, W, H, RIM_W / 2), "stroke-width": RIM_W });
    gRims.append(rim);
    const sprite = el("image", { class: "sprite" });
    gSprites.append(sprite);
    byId.set(s.id, { s, half, g, rim, sprite, spriteReady: false, neighbors: [] });
  }

  const edges = [];
  for (const [a, b] of tree.edges || []) {
    const A = byId.get(a), B = byId.get(b); if (!A || !B) continue;
    A.neighbors.push(b); B.neighbors.push(a);
    let x1 = A.s.x * W, y1 = A.s.y * H, x2 = B.s.x * W, y2 = B.s.y * H;
    const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1); // lines are axis-aligned; stop at each frame edge
    x1 += dx * A.half; y1 += dy * A.half; x2 -= dx * B.half; y2 -= dy * B.half;
    const pad = LINE_W / 2 + 1.5;
    const box = { x: Math.min(x1, x2) - (dx ? 0 : pad), y: Math.min(y1, y2) - (dy ? 0 : pad), w: Math.abs(x2 - x1) + (dx ? 0 : pad * 2), h: Math.abs(y2 - y1) + (dy ? 0 : pad * 2) };
    const image = el("image", { class: "path", x: box.x, y: box.y, width: box.w, height: box.h, preserveAspectRatio: "none" });
    gLines.append(image);
    edges.push({ a, b, box, image, cache: {} });
  }
  root.append(svg);

  // Paint the visible part of the screenshot layers for world rect (x,y,w,h) onto ctx at zoom Z.
  function rasterize(ctx, x, y, w, h, Z) {
    for (const { img, L } of sources) {
      const r = L.rect, c = L.clip;
      const x0 = Math.max(x, r.x * W), y0 = Math.max(y, r.y * H, c.y0 * H);
      const x1 = Math.min(x + w, (r.x + r.w) * W), y1 = Math.min(y + h, (r.y + r.h) * H, c.y1 * H);
      if (x1 <= x0 || y1 <= y0 || !img.naturalWidth) continue;
      const kx = img.naturalWidth / (r.w * W), ky = img.naturalHeight / (r.h * H);
      ctx.drawImage(img, (x0 - r.x * W) * kx, (y0 - r.y * H) * ky, (x1 - x0) * kx, (y1 - y0) * ky, (x0 - x) * Z, (y0 - y) * Z, (x1 - x0) * Z, (y1 - y0) * Z);
    }
  }
  const Z = 3;
  const canvas = (w, h) => { const cv = document.createElement("canvas"); cv.width = Math.ceil(w * Z); cv.height = Math.ceil(h * Z); return [cv, cv.getContext("2d", { willReadFrequently: true })]; };

  // ---- lit icons: re-light the node straight from the screenshot pixels ----
  function makeSprite(n) {
    const { s, half } = n, cx = s.x * W, cy = s.y * H, side = (half + 1) * 2;
    if (s.litSprite) { // pre-rendered lit version (class nodes whose "locked" art was replaced with the class icon)
      const h = s.litSprite.half;
      for (const [k, v] of Object.entries({ href: s.litSprite.src, x: cx - h, y: cy - h, width: h * 2, height: h * 2 })) n.sprite.setAttribute(k, v);
      return true;
    }
    const [cv, ctx] = canvas(side, side);
    const c = cv.width / 2, hz = (half - 0.5) * Z;
    ctx.beginPath();
    if (s.shape === "diamond") { ctx.moveTo(c, c - hz); ctx.lineTo(c + hz, c); ctx.lineTo(c, c + hz); ctx.lineTo(c - hz, c); ctx.closePath(); }
    else ctx.rect(c - hz, c - hz, hz * 2, hz * 2);
    ctx.clip();
    ctx.imageSmoothingQuality = "high";
    rasterize(ctx, cx - half - 1, cy - half - 1, side, side, Z);
    const d = ctx.getImageData(0, 0, cv.width, cv.height), a = d.data;
    for (let i = 0; i < a.length; i += 4) { a[i] *= GAIN; a[i + 1] *= GAIN; a[i + 2] *= GAIN; }
    ctx.putImageData(d, 0, 0);
    n.sprite.setAttribute("href", cv.toDataURL());
    n.sprite.setAttribute("x", cx - half - 1); n.sprite.setAttribute("y", cy - half - 1);
    n.sprite.setAttribute("width", side); n.sprite.setAttribute("height", side);
    return true;
  }

  // ---- lit pathways: recolour only the line-coloured pixels, so labels stay on top ----
  function lineHref(e, state) {
    if (e.cache[state]) return e.cache[state];
    const { box } = e, [cv, ctx] = canvas(box.w, box.h);
    rasterize(ctx, box.x, box.y, box.w, box.h, Z);
    const d = ctx.getImageData(0, 0, cv.width, cv.height), a = d.data, col = COLORS[state];
    for (let i = 0; i < a.length; i += 4) {
      const t = Math.min(1, Math.max(0, (a[i + 2] - a[i] - 5) / 10)); // bluish-grey = line; white label text is neutral
      a[i] = col[0]; a[i + 1] = col[1]; a[i + 2] = col[2]; a[i + 3] = t * 255;
    }
    ctx.putImageData(d, 0, 0);
    return (e.cache[state] = cv.toDataURL());
  }

  function render(selected) {
    const ready = sources.every(({ img }) => img.complete && img.naturalWidth); // never bake sprites from unloaded images
    const avail = new Set();
    for (const id of selected) for (const nb of byId.get(id)?.neighbors || []) if (!selected.has(nb)) avail.add(nb);
    for (const [id, n] of byId) {
      const isSel = selected.has(id), isAvail = avail.has(id);
      n.g.classList.toggle("selected", isSel);
      n.rim.style.opacity = isSel ? 1 : 0;
      // start nodes (Nomad, Ranger, Wizard) are already drawn lit in the screenshots, so they need no sprite
      const lit = ready && (isSel || isAvail) && (!n.s.start || n.s.litSprite);
      if (lit && !n.spriteReady) n.spriteReady = makeSprite(n);
      n.sprite.style.display = lit && n.spriteReady ? "" : "none";
    }
    for (const e of edges) {
      const a = selected.has(e.a), b = selected.has(e.b);
      const state = a && b ? "lineSelected" : a || b ? "lineAvailable" : null;
      if (!ready) { e.image.style.display = "none"; continue; }
      if (state && e.state !== state) e.image.setAttribute("href", lineHref(e, state));
      e.state = state; e.image.style.display = state ? "" : "none";
    }
  }
  // sprites need decoded images; re-render once they load
  return { render, whenReady: Promise.all(sources.map(({ img }) => img.decode().catch(() => {}))) };
}
