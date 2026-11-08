// Item data + the in-game style item tooltip. Data comes from data/items.json (built by tools/build-items.py from the wiki's game-data JSON).
export const SLOT_KEYS = { Pet: "pet", Helmet: "helmet", Cape: "cape", Weapon: "weapon", Armor: "armor", Ability: "ability", Boots: "boots", Ring: "ring" };
export const SLOT_NAMES = Object.keys(SLOT_KEYS);
// name colours as they look in the game's tooltips (Rare/Epic sampled from screenshots, the rest from the game data)
export const RARITY = { Common: "#c7cfcc", Uncommon: "#75a743", Rare: "#5e8db6", Epic: "#964489", Mythic: "#e4e13b" };
export const iconOf = (item) => `assets/items/${item.id}.png`;

export async function loadItems() {
  const r = await fetch("data/items.json"); if (!r.ok) throw new Error("Could not load data/items.json");
  const j = await r.json();
  return { items: j.items, byId: new Map(j.items.map((i) => [i.id, i])) };
}

const STAT = { Str: "Strength", Dex: "Dexterity", Wil: "Willpower" };
const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

// "+1% Str" scaling: +1% of the damage per point of your TOTAL stat (base + bonuses).
function scaling(entry, damage, stats) {
  const pts = [...(entry.Note || "").matchAll(/(\d+(?:\.\d+)?)% (Str|Dex|Wil)/g)];
  if (!pts.length || damage == null) return entry.Text;
  const v = pts.reduce((sum, m) => sum + damage * (+m[1] / 100) * (stats ? stats.total(STAT[m[2]]) : 0), 0);
  return `+${v.toFixed(1)} Dmg`;
}

function rows(list, stats) {
  const box = mk("div", "tt-block");
  const damage = (list.find((e) => e.Label === "Damage") || {}).Text;
  for (const e of list) {
    if (!e.Label) { const t = mk("div", "tt-line" + (e.Break ? " head" : ""), e.Text); if (e.Color && !e.Break) t.style.color = e.Color; box.append(t); continue; }
    const row = mk("div", "tt-row"), val = mk("span", "tt-val", e.Label === "Scaling" ? scaling(e, parseFloat(damage), stats) : e.Text);
    if (e.Color) val.style.color = e.Color;
    if (e.Note) val.append(mk("small", "", e.Note));
    row.append(mk("span", "tt-label", e.Label), val); box.append(row);
  }
  return box;
}

export function buildTooltip(item, stats) {
  const color = RARITY[item.rarity] || "#fff", tip = item.tip || {}, el = mk("div", "tt");
  const head = mk("div", "tt-block tt-head");
  const icon = mk("div", "tt-icon"); icon.style.borderColor = color;
  const img = new Image(); img.src = iconOf(item); img.alt = ""; icon.append(img, mk("span", "", item.tier));
  const mid = mk("div", "tt-mid"), name = mk("div", "tt-name", item.name); name.style.color = color;
  mid.append(name, mk("div", "tt-sub", item.sub));
  const rar = mk("div", "tt-rar", item.rarity); rar.style.color = color;
  head.append(icon, mid, rar); el.append(head);
  for (const key of ["Stats", "OnImpact", "Conditional"]) if (tip[key] && tip[key].length) el.append(rows(tip[key], stats));
  if (item.desc) el.append(mk("div", "tt-block tt-desc", item.desc));
  if (item.found) el.append(mk("div", "tt-block tt-found", `Found: ${item.found}`));
  return el;
}

// one shared floating tooltip that follows the pointer
export function attachTooltip(host, target, getItem, getStats) {
  const box = document.getElementById("itemTip");
  target.addEventListener("pointerenter", (e) => { const it = getItem(); if (!it) return; box.replaceChildren(buildTooltip(it, getStats())); box.hidden = false; move(e); });
  target.addEventListener("pointermove", move);
  target.addEventListener("pointerleave", () => { box.hidden = true; });
  function move(e) {
    if (box.hidden) return;
    const r = host.getBoundingClientRect(), w = box.offsetWidth, h = box.offsetHeight;
    let x = e.clientX - r.left + 18, y = e.clientY - r.top + 18;
    if (x + w > r.width - 6) x = e.clientX - r.left - w - 18;
    if (y + h > r.height - 6) y = Math.max(6, r.height - h - 6);
    box.style.left = Math.max(6, x) + "px"; box.style.top = y + "px";
  }
}
