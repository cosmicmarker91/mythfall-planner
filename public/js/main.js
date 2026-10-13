import { loadTree } from "./tree-source.js";
import { buildWorld } from "./world.js";
import { Viewport } from "./viewport.js";
import { Selection, writeUrl, readUrl, shareUrl, community } from "./build-store.js";

const $ = (id) => document.getElementById(id);
let toastTimer;
function toast(msg, action) {
  const t = $("toast"); t.replaceChildren(msg);
  if (action) { const b = document.createElement("button"); b.textContent = action.label; b.onclick = () => { action.fn(); t.classList.remove("show"); }; t.append(b); }
  t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), action ? 6000 : 2500);
}

const tree = await loadTree();
const world = buildWorld($("world"), tree);
const sel = new Selection(new Set(tree.skills.map((s) => s.id)));

const render = () => {
  world.render(sel.set);
  $("count").textContent = sel.set.size;
  const nameEl = $("buildName"); if (document.activeElement !== nameEl) nameEl.value = sel.name;
};
sel.onChange(() => { render(); writeUrl(sel); });

const view = new Viewport($("viewport"), $("world"), {
  worldW: tree.world.width, worldH: tree.world.height,
  onTap: (el) => { const g = el && el.closest && el.closest("[data-id]"); if (g) sel.toggle(g.dataset.id); },
});

// restore shared build from the URL
const loadFromUrl = () => {
  const { ids, name } = readUrl();
  sel.replace(ids, name);
  const bad = ids.filter((i) => !sel.valid.has(i)).length;
  if (bad) toast(`${bad} skill${bad > 1 ? "s" : ""} in this link no longer exist`);
};
loadFromUrl(); render();
world.whenReady.then(render); // lit icons are cut from the screenshots, so redraw once they have decoded
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
  if (!sel.set.size) return toast("Select some skills first");
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
