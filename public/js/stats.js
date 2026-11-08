// Stat engine (nodes only for now; equipment will plug into the same totals later).
// Reads the effect lines of owned nodes (wiki text) and returns base-stat bonuses plus the bonus-stat list.
export const BASE = ["Vitality", "Energy", "Willpower", "Defense", "Strength", "Dexterity"];
const RENAME = { "Damage %": "Bonus Damage Percent" };
const ORDER = ["Speed", "Critical Chance", "Mana Regeneration", "Poison Chance", "Battle Frenzy", "Bonus Attack Speed", "Luck", "Bleed Chance",
  "Bonus Damage Percent", "Festering", "Rending Fury", "Bloodlust", "Bonus Invulnerability"];
const rename = (n) => RENAME[n] || n;

// Does a "With ..." header apply right now? Weapon-type and equipped-set conditions can be answered; health/enemy ones cannot (not counted).
function condition(header, ctx) {
  const h = header.replace(/^With\s*/, "").replace(/:$/, "").trim();
  if (h.startsWith("-")) return h.split(" - ").map((x) => x.replace(/^-\s*/, "").trim()).filter(Boolean).every((n) => ctx.names.has(n));
  let m = h.match(/^(Melee|Ranged|Magic) Weapons?$/);
  if (m) return !!ctx.weapon && ctx.weapon.sub.startsWith(m[1]);
  if (/^[A-Z][a-z]+$/.test(h)) return !!ctx.weapon && ctx.weapon.cls === h;   // Staff, Bow, Cannon, Throwable, Sword ...
  return false;
}

// Lines that only apply in some situations ("With full Health", "(per Nearby Enemy ...)") are not counted.
function parse(effect, ctx) {
  const out = { flat: [], derived: [], mult: [], gain: [] };
  let active = true;
  for (const raw of effect) {
    const line = raw.trim();
    if (/^With /.test(line)) { active = condition(line, ctx); continue; }
    if (/^Without /.test(line)) { active = false; continue; }
    if (!active || line.includes("(per ")) continue;
    let m;
    if ((m = line.match(/^Gain No (.+)$/))) out.mult.push([rename(m[1]), 0]);
    else if ((m = line.match(/^Gain ([^:]+):/))) out.gain.push(m[1]);
    else if ((m = line.match(/^([+-]\d+(?:\.\d+)?) (.+?) \((\d+(?:\.\d+)?)% of (Base|Total) (.+)\)$/))) {
      out.flat.push([rename(m[2]), +m[1]]); out.derived.push({ stat: rename(m[2]), pct: +m[3] / 100, mode: m[4], src: rename(m[5]) });
    } else if ((m = line.match(/^([+-]\d+(?:\.\d+)?) (.+)$/))) out.flat.push([rename(m[2].split(":")[0]), +m[1]]);
    else if ((m = line.match(/^(\d+(?:\.\d+)?)x (.+)$/))) out.mult.push([rename(m[2]), +m[1]]);
  }
  return out;
}

// Equipment adds flat stats the same way (signed numbers like "+5"; unsigned ones are the item's own damage/rate/range).
function itemLines(item, ctx) {
  const out = [], tip = item.tip || {};
  const take = (list) => { for (const e of list || []) if (e.Label && e.Label !== "Scaling") {
    if (/^[+-]\d/.test(e.Text)) out.push(`${e.Text} ${e.Label}`); else if (e.Text === "Gain") out.push(`Gain ${e.Label}:`); else if (/^\d+(\.\d+)?x$/.test(e.Text)) out.push(`${e.Text} ${e.Label}`);
  } };
  take(tip.Stats);
  const c = tip.Conditional;
  if (c && c.length && condition(c[0].Text || "", ctx)) take(c.slice(1));
  return out;
}

// nodes: owned node objects; points: base points in BASE order; equipped: equipped item objects.
export function computeStats(nodes, points, equipped = []) {
  const flat = {}, derived = [], mult = {}, gains = {};
  const ctx = { weapon: equipped.find((i) => i.type === "Weapon") || null, names: new Set(equipped.map((i) => i.name)) };
  const lists = [...nodes.map((n) => n.effect), ...equipped.map((i) => itemLines(i, ctx))];
  for (const effect of lists) {
    const p = parse(effect, ctx);
    for (const [k, v] of p.flat) flat[k] = (flat[k] || 0) + v;
    derived.push(...p.derived);
    for (const [k, v] of p.mult) mult[k] = (mult[k] ?? 1) * v;
    for (const k of p.gain) gains[k] = (gains[k] || 0) + 1;
  }
  const pts = (name) => { const i = BASE.indexOf(name); return i < 0 ? 0 : points[i]; };
  let extra = {};                       // derived ("% of Base/Total X") values from the previous pass
  for (let pass = 0; pass < 8; pass++) { // totals can depend on each other (Shadow Strength <-> Shadow Dexterity), so iterate
    const total = (name) => pts(name) + (flat[name] || 0) + (extra[name] || 0);
    const next = {};
    for (const d of derived) next[d.stat] = (next[d.stat] || 0) + Math.floor(d.pct * (d.mode === "Base" ? pts(d.src) : total(d.src)));
    extra = next;
  }
  const bonus = (name) => ((flat[name] || 0) + (extra[name] || 0)) * (mult[name] ?? 1);
  const base = Object.fromEntries(BASE.map((n, i) => [n, { points: points[i], bonus: bonus(n), total: points[i] + bonus(n) }]));
  const list = [];
  const names = new Set([...Object.keys(flat), ...Object.keys(extra), ...Object.keys(gains)].filter((n) => !BASE.includes(n)));
  for (const n of names) { const v = (n in gains && !(n in flat)) ? gains[n] : bonus(n); if (v) list.push([n, v]); }
  list.sort((a, b) => { const ia = ORDER.indexOf(a[0]), ib = ORDER.indexOf(b[0]); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a[0].localeCompare(b[0]); });
  const total = (name) => pts(name) + (flat[name] || 0) + (extra[name] || 0);
  return { base, list, total, pts };
}

// Node description with its "+0 X (n% of Total Y)" number filled in from your current stats.
const PCT = /^([+-]\d+(?:\.\d+)?) (.+?) \((\d+(?:\.\d+)?)% of (Base|Total) (.+)\)$/;
export function liveLine(line, stats) {
  const m = line.match(PCT); if (!m) return line;
  const v = +m[1] + Math.floor((+m[3] / 100) * (m[4] === "Base" ? stats.pts(m[5]) : stats.total(m[5])));
  return line.replace(/^[+-]\d+(?:\.\d+)?/, fmt(v));
}

// Damage you take from one hit: hit * hit / (hit + defense), never below 20% of the hit.
export const damageTaken = (hit, defense) => Math.round(Math.max((hit * hit) / (hit + Math.max(0, defense)), 0.2 * hit));
export const fmt = (v) => { const r = Math.round(v * 100) / 100; return (r > 0 ? "+" : "") + r; };
