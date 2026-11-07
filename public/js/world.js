// Draws the tree as ONE SVG in world coordinates (so nodes, links and labels share a single transform and
// can't drift apart). Icons are the wiki's 16x16 skill-tree sprites, drawn pixelated; the frames are drawn
// here in the colours sampled from the real game UI.
import { Graph } from "./graph.js";

const SVG = "http://www.w3.org/2000/svg";
const el = (name, attrs = {}, parent) => {
  const e = document.createElementNS(SVG, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.append(e);
  return e;
};

// Seeded star field (the game draws one behind the tree).
function stars(parent, W, H) {
  let s = 1234567;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const cols = ["#1b2554", "#243070", "#2c3a88", "#34428f", "#5a6aa8", "#c9d3ff"];
  const g = el("g", { class: "stars" }, parent), pad = 700;
  for (let i = 0; i < 900; i++) {
    const big = rnd() < 0.08, sz = big ? 3 : 2, c = cols[Math.floor(rnd() * (big ? 6 : 4))];
    el("rect", { x: Math.round(-pad + rnd() * (W + 2 * pad)), y: Math.round(-pad + rnd() * (H + 2 * pad)), width: sz, height: sz, fill: c, opacity: big ? 0.8 : 0.9 }, g);
  }
}

const octagon = (h, c) => `${-h + c},${-h} ${h - c},${-h} ${h},${-h + c} ${h},${h - c} ${h - c},${h} ${-h + c},${h} ${-h},${h - c} ${-h},${-h + c}`;
const diamond = (h) => `0,${-h} ${h},0 0,${h} ${-h},0`;

// Per-kind geometry (world px; the screenshots are ~1:1 with these at pitch 50).
function build(n, g) {
  const icon = (s) => el("image", { href: n.icon, x: -s / 2, y: -s / 2, width: s, height: s, class: "ico" }, g);
  let half, rim, hit;
  if (n.kind === "notable") {
    half = 20;
    el("rect", { x: -20, y: -20, width: 40, height: 40, class: "bd" }, g);
    el("rect", { x: -18, y: -18, width: 36, height: 36, class: "band" }, g);
    el("rect", { x: -16, y: -16, width: 32, height: 32, class: "panel" }, g);
    icon(32);
    rim = el("rect", { x: -22.5, y: -22.5, width: 45, height: 45, class: "rim" }, g);
    hit = el("rect", { x: -23, y: -23, width: 46, height: 46, class: "hit" }, g);
  } else if (n.kind === "keystone") {
    half = 38;
    el("rect", { x: -38, y: -38, width: 76, height: 76, class: "bd key" }, g);
    el("rect", { x: -34, y: -34, width: 68, height: 68, class: "band" }, g);
    el("rect", { x: -31, y: -31, width: 62, height: 62, class: "panel key" }, g);
    icon(56);
    rim = el("rect", { x: -41, y: -41, width: 82, height: 82, class: "rim" }, g);
    hit = el("rect", { x: -40, y: -40, width: 80, height: 80, class: "hit" }, g);
  } else if (n.kind === "start") {
    half = 32;
    el("polygon", { points: octagon(32, 11), class: "bd start" }, g);
    el("polygon", { points: octagon(29, 10), class: "panel start" }, g);
    icon(56);
    rim = el("polygon", { points: octagon(35, 12), class: "rim" }, g);
    hit = el("polygon", { points: octagon(36, 12), class: "hit" }, g);
  } else {
    // travel nodes: a small diamond. Star-shaped icons (16px) sit inside as-is; the blob/crescent icons are drawn 1.5x in a larger diamond
    const big = !n.framed, h = big ? 16 : 14, sz = big ? 24 : 16;
    half = h;
    el("polygon", { points: diamond(h + 1), class: "bd" }, g);
    el("polygon", { points: diamond(h - 2), class: "band" }, g);
    el("polygon", { points: diamond(h - 4), class: "panel" }, g);
    icon(sz);
    rim = el("polygon", { points: diamond(h + 4), class: "rim" }, g);
    hit = el("polygon", { points: diamond(h + 6), class: "hit" }, g);
  }
  return { half, rim, hit };
}

export function buildWorld(root, tree, { onHover } = {}) {
  const { width: W, height: H } = tree.world;
  root.style.width = W + "px"; root.style.height = H + "px"; root.replaceChildren();
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}` }, root);
  stars(svg, W, H);
  const gEdges = el("g", { class: "edges" }, svg), gNodes = el("g", { class: "nodes" }, svg), gOver = el("g", { class: "over" }, svg);

  const pos = new Map(tree.nodes.map((n) => [n.id, n]));
  const edges = tree.edges.map(([a, b]) => {
    const A = pos.get(a), B = pos.get(b);
    return { a, b, key: Graph.key(a, b), line: el("line", { x1: A.x, y1: A.y, x2: B.x, y2: B.y, class: "edge" }, gEdges) };
  });

  const byId = new Map();
  for (const n of tree.nodes) {
    const g = el("g", { class: `skill ${n.kind}`, transform: `translate(${n.x} ${n.y})` }, gNodes);
    g.dataset.id = n.id;
    const { half, rim, hit } = build(n, g);
    if (n.kind !== "travel") { // big nodes carry their name; it only becomes legible once you zoom in
      const label = el("text", { y: half + 9, class: "lbl" }, g); label.textContent = n.name;
    }
    hit.addEventListener("pointerenter", () => onHover && onHover(n.id));
    hit.addEventListener("pointerleave", () => onHover && onHover(null));
    byId.set(n.id, { n, g, half, rim });
  }

  // hover label (any node) + path-cost badge, drawn above everything
  const hoverLbl = el("text", { class: "hoverlbl" }, gOver);
  const badge = el("g", { class: "badge" }, gOver);
  el("image", { href: "assets/skill-point.png", x: -8, y: -8, width: 16, height: 16, class: "orb" }, badge);
  const badgeTxt = el("text", { x: 7, y: 9, class: "badgetxt" }, badge);
  let scale = 1;
  const place = (id, cost) => {
    const r = id && byId.get(id);
    if (!r) { hoverLbl.style.display = "none"; badge.style.display = "none"; return; }
    const k = Math.max(1, 1.1 / scale), { n, half } = r;
    hoverLbl.style.display = ""; hoverLbl.textContent = n.name;
    hoverLbl.setAttribute("x", n.x); hoverLbl.setAttribute("y", n.y + half + 10 * k); hoverLbl.style.fontSize = 8 * k + "px";
    if (cost) {
      badge.style.display = ""; badgeTxt.textContent = cost; badgeTxt.style.fontSize = "10px";
      badge.setAttribute("transform", `translate(${n.x + half * 0.6} ${n.y - half - 9 * k}) scale(${k})`);
    } else badge.style.display = "none";
  };
  place(null);

  let last = { hover: null, cost: 0 };
  return {
    // state: { owned:Set, avail:Set, plan:{cost,path}|null, hover:id|null }
    render({ owned, avail, plan, hover }) {
      const onPath = new Set(plan ? plan.path : []), pathEdges = new Set();
      if (plan) for (let i = 1; i < plan.path.length; i++) pathEdges.add(Graph.key(plan.path[i - 1], plan.path[i]));
      for (const [id, r] of byId) {
        const c = r.g.classList;
        c.toggle("owned", owned.has(id));
        c.toggle("lit", owned.has(id) || avail.has(id) || onPath.has(id) || r.n.kind === "start");
        c.toggle("path", onPath.has(id));
        c.toggle("hover", hover === id);
      }
      for (const e of edges) {
        const ao = owned.has(e.a), bo = owned.has(e.b);
        const keyA = byId.get(e.a).n.kind === "keystone", keyB = byId.get(e.b).n.kind === "keystone";
        const cut = (ao && keyA && !bo) || (bo && keyB && !ao); // an owned keystone severs its other connections
        const cls = ["edge"];
        if (pathEdges.has(e.key)) cls.push("path");
        else if (ao && bo) cls.push("owned");
        else if ((ao && !keyA) || (bo && !keyB)) cls.push("avail");
        if (cut) cls.push("cut");
        e.line.setAttribute("class", cls.join(" "));
      }
      last = { hover, cost: plan && plan.cost };
      place(hover, last.cost);
    },
    // called by the viewport on every zoom: big-node names appear once zoomed in; the hover label keeps a readable size
    setScale(s, fit) {
      scale = s;
      root.classList.toggle("zoomed", s >= fit * 2.1);
      place(last.hover, last.cost);
    },
  };
}
