// Selected-skill state + URL sharing + community storage.
// URL format:  #s=id1,id2,id3&n=Build%20name   (ids are the stable skill ids from tree.json)
export class Selection {
  constructor(validIds) { this.valid = validIds; this.set = new Set(); this.name = ""; this.listeners = []; }
  onChange(fn) { this.listeners.push(fn); }
  #emit() { this.listeners.forEach((f) => f(this)); }
  toggle(id) { this.set.has(id) ? this.set.delete(id) : this.set.add(id); this.#emit(); }
  replace(ids, name = this.name) { this.set = new Set(ids.filter((i) => this.valid.has(i))); this.name = name; this.#emit(); }
  clear() { this.set = new Set(); this.#emit(); }
  ids() { return [...this.set].sort(); }
}

export function writeUrl(sel) {
  const p = new URLSearchParams();
  if (sel.set.size) p.set("s", sel.ids().join(","));
  if (sel.name) p.set("n", sel.name);
  const hash = p.toString();
  history.replaceState(null, "", location.pathname + location.search + (hash ? "#" + hash : ""));
}
export function readUrl() {
  const p = new URLSearchParams(location.hash.slice(1));
  return { ids: (p.get("s") || "").split(",").filter(Boolean), name: p.get("n") || "" };
}
export const shareUrl = (sel) => { writeUrl(sel); return location.href; };

// Community: local server API (data/community.json) with a localStorage fallback.
const LS = "mythfall.community.v1";
const lsRead = () => { try { return JSON.parse(localStorage.getItem(LS) || "[]"); } catch { return []; } };
export const community = {
  async list() {
    try {
      const r = await fetch("api/builds"); if (!r.ok) throw 0;
      return { builds: await r.json(), local: false };
    } catch { return { builds: lsRead().slice().reverse(), local: true }; }
  },
  async publish(name, skills) {
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
