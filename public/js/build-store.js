// Selected-skill state + URL sharing + community storage.
// URL format:  #s=id1,id2,id3&n=Build%20name   (ids are the stable skill ids from tree.json)
export class Selection {
  constructor(validIds) { this.valid = validIds; this.set = new Set(); this.name = ""; this.base = [0, 0, 0, 0, 0, 0]; this.listeners = []; }
  onChange(fn) { this.listeners.push(fn); }
  #emit() { this.listeners.forEach((f) => f(this)); }
  toggle(id) { this.set.has(id) ? this.set.delete(id) : this.set.add(id); this.#emit(); }
  replace(ids, name = this.name) { this.set = new Set(ids.filter((i) => this.valid.has(i))); this.name = name; this.#emit(); }
  clear() { this.set = new Set(); this.#emit(); }
  setBase(base) { this.base = base; this.#emit(); }
  ids() { return [...this.set].sort(); }
}

export function writeUrl(sel) {
  const p = new URLSearchParams();
  if (sel.set.size) p.set("s", sel.ids().join(","));
  if (sel.name) p.set("n", sel.name);
  if (sel.base.some(Boolean)) p.set("b", sel.base.join(","));
  const hash = p.toString();
  history.replaceState(null, "", location.pathname + location.search + (hash ? "#" + hash : ""));
}
export function readUrl() {
  const p = new URLSearchParams(location.hash.slice(1));
  const b = (p.get("b") || "").split(",").map((x) => Math.max(0, Math.min(20, parseInt(x, 10) || 0)));
  return { ids: (p.get("s") || "").split(",").filter(Boolean), name: p.get("n") || "", base: Array.from({ length: 6 }, (_, i) => b[i] || 0) };
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
