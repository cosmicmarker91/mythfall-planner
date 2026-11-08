// Item picker: tabs per equipment slot, search, rarity-coloured list. Hover = tooltip, click = equip.
import { SLOT_KEYS, SLOT_NAMES, RARITY, iconOf, attachTooltip } from "./items.js";
const RANK = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Mythic: 4 };   // list order: rarity, then tier, then name
const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

export function initPicker({ $, data, sel, getStats }) {
  const overlay = $("pickOverlay"), tabs = $("pickTabs"), list = $("pickList"), search = $("pickSearch");
  let tab = "Weapon";
  const equipped = () => data.byId.get(sel.equip[SLOT_KEYS[tab]]);

  SLOT_NAMES.forEach((name) => {
    const b = mk("button", "pk-tab"); b.title = name; b.dataset.tab = name;
    const img = new Image(); img.src = `assets/slots/${SLOT_KEYS[name]}.png`; img.alt = name; b.append(img);
    b.onclick = () => { tab = name; render(); };
    tabs.append(b);
  });

  function render() {
    tabs.querySelectorAll(".pk-tab").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
    $("pickTitle").textContent = tab === "Armor" ? "Armor" : tab;
    const q = search.value.trim().toLowerCase(), cur = equipped();
    list.replaceChildren();
    const shown = data.items.filter((i) => i.type === tab && (!q || i.name.toLowerCase().includes(q)))
      .sort((a, b) => (RANK[a.rarity] ?? 9) - (RANK[b.rarity] ?? 9) || parseInt(a.tier.slice(1)) - parseInt(b.tier.slice(1)) || a.name.localeCompare(b.name));
    for (const it of shown) {
      const b = mk("button", "pk-item" + (cur && cur.id === it.id ? " cur" : "")); b.setAttribute("aria-label", it.name);
      const img = new Image(); img.src = iconOf(it); img.alt = ""; b.append(img, mk("span", "pk-tier", it.tier));
      b.style.borderColor = RARITY[it.rarity];
      b.onclick = () => { sel.setEquip({ ...sel.equip, [SLOT_KEYS[tab]]: it.id }); close(); };
      attachTooltip(overlay, b, () => it, getStats);
      list.append(b);
    }
    $("pickEmpty").hidden = list.children.length > 0;
    $("pickClear").hidden = !cur;
  }
  const open = (t) => { if (t) tab = t; overlay.hidden = false; search.value = ""; render(); search.focus(); };
  const close = () => { overlay.hidden = true; $("itemTip").hidden = true; };
  search.oninput = render;
  $("pickClear").onclick = () => { const e = { ...sel.equip }; delete e[SLOT_KEYS[tab]]; sel.setEquip(e); close(); };
  $("pickClose").onclick = close;
  overlay.addEventListener("pointerdown", (e) => { if (e.target === overlay) close(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !overlay.hidden) close(); });
  return { open };
}
