// Selected-skill state + URL sharing + community storage.
export class Selection {
  constructor(validIds) { this.valid = validIds; this.set = new Set(); this.name = ""; this.base = [0, 0, 0, 0, 0, 0]; this.equip = {}; this.listeners = []; }
  onChange(fn) { this.listeners.push(fn); }
  #emit() { this.listeners.forEach((f) => f(this)); }
  toggle(id) { this.set.has(id) ? this.set.delete(id) : this.set.add(id); this.#emit(); }
  replace(ids, name = this.name) { this.set = new Set(ids.filter((i) => this.valid.has(i))); this.name = name; this.#emit(); }
  clear() { this.set = new Set(); this.#emit(); }
  setBase(base) { this.base = base; this.#emit(); }
  setEquip(equip) { this.equip = equip; this.#emit(); }
  ids() { return [...this.set].sort(); }
}

// Short links:  #v=2&t=<bitmap of owned nodes>&b=<6 stat chars>&e=<2 chars per item>&c=<tree check>&n=name
// t is one bit per node in tree order (188 nodes = 32 characters). c fingerprints the node list so a link made for an
// older tree is detected instead of silently decoding to the wrong skills. Old long links (#s=id1,id2 ...) still load.
let ORDER = [], CHECK = "";
export function setCodec(order) {
  ORDER = order;
  let h = 5381; for (const ch of order.join("|")) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
  CHECK = h.toString(36).slice(-4);
}
const b64 = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (t) => Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export function writeUrl(sel) {
  const p = new URLSearchParams();
  if (sel.set.size || sel.base.some(Boolean) || Object.keys(sel.equip).length) p.set("v", "2");
  if (sel.set.size) {
    const bytes = new Uint8Array(Math.ceil(ORDER.length / 8));
    ORDER.forEach((id, i) => { if (sel.set.has(id)) bytes[i >> 3] |= 1 << (i & 7); });
    p.set("t", b64(bytes)); p.set("c", CHECK);
  }
  if (sel.base.some(Boolean)) p.set("b", sel.base.map((x) => x.toString(36)).join(""));
  const eq = Object.values(sel.equip).filter(Boolean); if (eq.length) p.set("e", eq.map((id) => id.toString(36).padStart(2, "0")).join(""));
  if (sel.name) p.set("n", sel.name);
  const hash = p.toString();
  history.replaceState(null, "", location.pathname + location.search + (hash ? "#" + hash : ""));
}
export function readUrl() {
  const p = new URLSearchParams(location.hash.slice(1)), clamp = (x) => Math.max(0, Math.min(20, x || 0));
  if (p.get("v") === "2") {
    let ids = [], stale = false;
    if (p.get("t")) {
      if (p.get("c") !== CHECK) stale = true;
      else { const bytes = unb64(p.get("t")); ids = ORDER.filter((_, i) => bytes[i >> 3] & (1 << (i & 7))); }
    }
    const bs = p.get("b") || "", es = p.get("e") || "";
    return { ids, stale, name: p.get("n") || "", base: Array.from({ length: 6 }, (_, i) => clamp(parseInt(bs[i] || "0", 36))),
      equip: (es.match(/.{2}/g) || []).map((x) => parseInt(x, 36)).filter(Boolean) };
  }
  const b = (p.get("b") || "").split(",").map((x) => clamp(parseInt(x, 10)));   // old long format
  return { ids: (p.get("s") || "").split(",").filter(Boolean), stale: false, name: p.get("n") || "", base: Array.from({ length: 6 }, (_, i) => b[i] || 0), equip: (p.get("e") || "").split(",").map(Number).filter(Boolean) };
}
export const shareUrl = (sel) => { writeUrl(sel); return location.href; };

// Community: 1) Firebase Firestore REST (works on any static host) if js/config.js is filled in,
// 2) the local server API (server.mjs / Cloudflare function), 3) this browser's localStorage.
import { FIREBASE } from "./config.js";
const LS = "mythfall.community.v1";
const lsRead = () => { try { return JSON.parse(localStorage.getItem(LS) || "[]"); } catch { return []; } };
const fs = () => FIREBASE.projectId && FIREBASE.apiKey;
const FS = () => `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents`;
const fromDoc = (d) => ({ id: d.name.split("/").pop(), name: d.fields.name.stringValue, skills: (d.fields.skills.arrayValue.values || []).map((v) => v.stringValue), createdAt: d.fields.createdAt.timestampValue });
export const community = {
  async list() {
    if (fs()) {
      try {
        const r = await fetch(`${FS()}:runQuery?key=${FIREBASE.apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "builds" }], orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }], limit: 100 } }) });
        if (!r.ok) throw 0;
        return { builds: (await r.json()).filter((x) => x.document).map((x) => fromDoc(x.document)), local: false };
      } catch { /* fall through */ }
    }
    try {
      const r = await fetch("api/builds"); if (!r.ok) throw 0;
      return { builds: await r.json(), local: false };
    } catch { return { builds: lsRead().slice().reverse(), local: true }; }
  },
  async publish(name, skills) {
    if (fs()) {
      try {
        const body = { fields: { name: { stringValue: name }, skills: { arrayValue: { values: skills.map((s) => ({ stringValue: s })) } }, createdAt: { timestampValue: new Date().toISOString() } } };
        const r = await fetch(`${FS()}/builds?key=${FIREBASE.apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!r.ok) throw 0;
        return { build: fromDoc(await r.json()), local: false };
      } catch { /* fall through */ }
    }
    try {
      const r = await fetch("api/builds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, skills }) });
      if (!r.ok) throw 0;
      return { build: await r.json(), local: false };
    } catch {
      const build = { id: Math.random().toString(36).slice(2, 10), name, skills, createdAt: new Date().toISOString() };
      try { localStorage.setItem(LS, JSON.stringify([...lsRead(), build].slice(-200))); } catch {}
      return { build, local: true };
    }
  },
};
