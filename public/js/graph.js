// Skill-tree rules (no rendering here).
//  * every node costs 1 skillpoint (observed in-game: "Skillpoint Cost: 1", and a 7-node path shows "Path Cost: 7")
//  * a path begins at a starting node (Nomad, Warrior, ...) or at any node you already own
//  * keystones sever connections: a path can END on a keystone but never runs THROUGH one, and an owned
//    keystone does not open up the nodes around it
export class Graph {
  constructor(tree) {
    this.nodes = new Map(tree.nodes.map((n) => [n.id, n]));
    this.adj = new Map(tree.nodes.map((n) => [n.id, []]));
    for (const [a, b] of tree.edges) { this.adj.get(a).push(b); this.adj.get(b).push(a); }
  }
  static key(a, b) { return a < b ? `${a}|${b}` : `${b}|${a}`; }
  #isKey(id) { return this.nodes.get(id).kind === "keystone"; }
  #isStart(id) { return this.nodes.get(id).kind === "start"; }

  // Unowned nodes that sit next to something you own (drawn lit, like the game does).
  available(owned) {
    const out = new Set();
    for (const id of owned) {
      if (this.#isKey(id)) continue;
      for (const nb of this.adj.get(id)) if (!owned.has(nb)) out.add(nb);
    }
    return out;
  }

  // Cheapest way to own `target`: { cost, path:[ids from the starting point to the target] }, or null (cannot reach).
  plan(target, owned) {
    if (owned.has(target)) return null;
    const dist = new Map(), prev = new Map(), done = new Set();
    for (const id of this.nodes.keys()) {
      if (owned.has(id) && !this.#isKey(id)) dist.set(id, 0);
      else if (this.#isStart(id)) dist.set(id, 1);
    }
    for (;;) {
      let u = null, best = Infinity;
      for (const [id, d] of dist) if (!done.has(id) && d < best) { best = d; u = id; }
      if (u === null || u === target) break;
      done.add(u);
      if (this.#isKey(u)) continue; // keystones are dead ends
      for (const v of this.adj.get(u)) {
        const nd = best + (owned.has(v) ? 0 : 1);
        if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); prev.set(v, u); }
      }
    }
    if (!dist.has(target)) return null;
    const chain = [];
    for (let id = target; id !== undefined; id = prev.get(id)) chain.push(id);
    chain.reverse(); // origin ... target; the origin may already be owned (cost 0)
    return { cost: dist.get(target), path: chain };
  }

  // Drop owned nodes that are no longer connected to an owned starting node.
  prune(owned) {
    const ok = new Set(), stack = [];
    for (const id of owned) if (this.#isStart(id)) { ok.add(id); stack.push(id); }
    while (stack.length) {
      const u = stack.pop();
      if (this.#isKey(u)) continue;
      for (const v of this.adj.get(u)) if (owned.has(v) && !ok.has(v)) { ok.add(v); stack.push(v); }
    }
    return ok;
  }
}
