import { loadTree } from "./tree-source.js";
import { Graph } from "./graph.js";
import { buildWorld } from "./world.js";
import { Viewport } from "./viewport.js";
import { Selection, writeUrl, readUrl, shareUrl, community } from "./build-store.js";
import { initCharacter } from "./character.js";
import { computeStats, liveLine } from "./stats.js";
import { loadItems, SLOT_KEYS } from "./items.js";
import { initPicker } from "./picker.js";

const $ = (id) => document.getElementById(id);
let toastTimer;
function toast(msg, action) {
  const t = $("toast"); t.replaceChildren(msg);
  if (action) { const b = document.createElement("button"); b.textContent = action.label; b.onclick = () => { action.fn(); t.classList.remove("show"); }; t.append(b); }
  t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), action ? 6000 : 2500);
}

const tree = await loadTree();
const data = await loadItems();
const graph = new Graph(tree);
const sel = new Selection(new Set(tree.nodes.map((n) => n.id)));   // sel.set = the nodes you have purchased
let pinned = null, hover = null;   // pinned = the node you clicked (shows a tick; click it again to buy)

const TYPE = { start: "Starting Node", keystone: "Keystone", notable: "Notable", travel: "Travel Node" };
const target = () => hover || pinned || "nomad";

const world = buildWorld($("world"), tree, { onHover: (id) => { hover = id; render(); } });

function renderPanel(id, plan) {
  const n = graph.nodes.get(id), owned = sel.set.has(id);
  const stats = computeStats([...sel.set].map((i) => graph.nodes.get(i)).filter(Boolean), sel.base, Object.values(sel.equip).map((i) => data.byId.get(i)).filter(Boolean));
  $("pIcon").src = n.icon; $("pIcon").parentElement.className = "p-icon " + n.kind;
  $("pName").textContent = n.name; $("pType").textContent = TYPE[n.kind];
  $("pEffects").replaceChildren(...n.effect.map((t) => { const d = document.createElement("div"); d.textContent = liveLine(t, stats); return d; }));
  const btn = $("pBtn"); btn.classList.toggle("refund", owned); btn.disabled = false;
  if (owned) { $("pCost").textContent = "Purchased"; btn.textContent = "Refund"; }
  else if (!plan) { $("pCost").textContent = "No path from a starting node"; btn.textContent = "Cannot Reach"; btn.disabled = true; }
  else if (plan.cost === 1) { $("pCost").textContent = "Skillpoint Cost: 1"; btn.textContent = "Purchase"; }
  else { $("pCost").textContent = `Path Cost: ${plan.cost} skillpoints`; btn.textContent = "Cannot Reach"; btn.disabled = true; } // like the game: only a node next to one you own (or a starting node) can be bought
  const pp = $("pPath"); pp.hidden = !(plan && plan.cost > 1); pp.textContent = plan ? `Purchase the whole path (${plan.cost} skillpoints)` : "";
}

function render() {
  const id = target(), plan = sel.set.has(id) ? null : graph.plan(id, sel.set);
  world.render({ owned: sel.set, avail: graph.available(sel.set), plan, hover, pinned });
  renderPanel(id, plan);
  $("count").textContent = sel.set.size;
  const nameEl = $("buildName"); if (document.activeElement !== nameEl) nameEl.value = sel.name;
}
let picker;
const character = initCharacter(sel, { $, graph, data, openPicker: (t) => picker.open(t) });
picker = initPicker({ $, data, sel, getStats: () => character.stats() });
sel.onChange(() => { render(); character.render(); writeUrl(sel); });

function purchase(id, wholePath = false) {
  const plan = graph.plan(id, sel.set);
  if (!plan) return toast("Cannot reach that node: paths can't run through keystones");
  if (plan.cost > 1 && !wholePath) return toast(`Cannot reach yet. It needs ${plan.cost} skillpoints along the path`);
  sel.replace([...sel.set, ...plan.path]);
}
function refund(id) {
  const next = new Set(sel.set); next.delete(id);
  const kept = graph.prune(next), lost = next.size - kept.size;
  sel.replace([...kept]);
  if (lost) toast(`Also refunded ${lost} node${lost > 1 ? "s" : ""} that were cut off`);
}
const act = (id) => (sel.set.has(id) ? refund(id) : purchase(id, true));
$("pBtn").onclick = () => act(target());
$("pPath").onclick = () => purchase(target(), true);

const view = new Viewport($("viewport"), $("world"), {
  worldW: tree.world.width, worldH: tree.world.height,
  onTap: (el) => {
    const g = el && el.closest && el.closest("[data-id]"), id = g && g.dataset.id;
    if (id && id === pinned) { act(id); return; }   // second click: buy (or refund if you own it)
    pinned = id || null; render();
  },
  onView: (s, fit) => world.setScale(s, fit),
});
// double-click also buys (the second click of a double-click already does; this covers a first click that only pinned)
$("viewport").addEventListener("dblclick", (e) => { const g = e.target.closest && e.target.closest("[data-id]"); if (g) { pinned = g.dataset.id; if (!sel.set.has(pinned)) purchase(pinned, true); else render(); } });

// restore shared build from the URL
const loadFromUrl = () => {
  const { ids, name, base, equip } = readUrl();
  sel.base = base; sel.equip = {}; for (const id of equip) { const it = data.byId.get(id); if (it) sel.equip[SLOT_KEYS[it.type]] = id; }
  sel.replace(ids, name);
  const bad = ids.filter((i) => !sel.valid.has(i)).length;
  if (bad) toast(`${bad} skill${bad > 1 ? "s" : ""} in this link no longer exist`);
};
loadFromUrl(); render();
addEventListener("hashchange", () => { if (location.href !== lastHref) loadFromUrl(); });
let lastHref = location.href; sel.onChange(() => { lastHref = location.href; });

$("reset").onclick = () => {
  if (!sel.set.size) return;
  const prev = sel.ids(); sel.clear();
  toast("Skills reset", { label: "Undo", fn: () => sel.replace(prev) });
};
$("fit").onclick = () => view.fit(true);
$("buildName").addEventListener("input", (e) => { sel.name = e.target.value.trim(); writeUrl(sel); });

$("share").onclick = async () => {
  const url = shareUrl(sel);
  try { await navigator.clipboard.writeText(url); toast("Link copied"); }
  catch { prompt("Copy this link:", url); }
};
$("publish").onclick = async () => {
  if (!sel.set.size) return toast("Purchase some skills first");
  if (!sel.name) { $("buildName").focus(); return toast("Give your build a name first"); }
  const { local } = await community.publish(sel.name, sel.ids());
  toast(local ? "Saved locally (server not running)" : "Published to community");
};

const dlg = $("community");
const openCommunity = async () => {
  const { builds, local } = await community.list();
  $("communityNote").textContent = local ? "Local-only list (the server API isn't reachable)." : "";
  const ul = $("communityList"); ul.replaceChildren();
  if (!builds.length) { const li = document.createElement("li"); li.textContent = "No builds published yet."; ul.append(li); }
  for (const b of builds) {
    const li = document.createElement("li");
    const meta = document.createElement("div"); meta.className = "meta";
    const nm = document.createElement("div"); nm.className = "nm"; nm.textContent = b.name;
    const sub = document.createElement("div"); sub.className = "sub"; sub.textContent = `${b.skills.length} skills · ${new Date(b.createdAt).toLocaleDateString()}`;
    meta.append(nm, sub);
    const load = document.createElement("button"); load.className = "mf-btn sm"; load.textContent = "Load";
    load.onclick = () => { sel.replace(b.skills, b.name); dlg.close(); };
    li.append(meta, load); ul.append(li);
  }
  dlg.showModal();
};
$("communityBtn").onclick = openCommunity;
$("closeCommunity").onclick = () => dlg.close();
dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
