#!/usr/bin/env python3
"""source/layout.json (positions + links read from screenshots) + node text/icons -> public/data/tree.json

Node text/icons come from the wiki's game-data JSON when you have saved it (quick update after a patch):
  1. open https://mythfall.wiki.gg/index.php?title=Module:Data/skill-tree.json&action=raw in your browser
  2. save it as source/skill-tree.raw.json   (a TextEdit .rtf is converted automatically)
  3. python3 tools/build-tree.py
Without that file it falls back to the catalogue in tools/catalog.py. Positions/links do not exist in the game data,
so a patch that ADDS or RENAMES nodes is reported at the end: those nodes need a position in source/layout.json."""
import json, re, pathlib, subprocess, sys, urllib.request
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from catalog import catalog
PITCH = 50
MARGIN = 90
FRAMED = {"strength", "dexterity", "willpower", "defense", "vitality", "speed", "critical", "luck"}   # travel nodes drawn inside a small diamond frame
KIND = {"Starting Node": "start", "Travel Node": "travel", "Notable": "notable", "Keystone": "keystone"}
cat = {c["name"]: c for c in catalog()}
RAW, RTF = ROOT / "source/skill-tree.raw.json", ROOT / "source/skill-tree.raw.json.rtf"
report = []
if RTF.exists() and (not RAW.exists() or RTF.stat().st_mtime > RAW.stat().st_mtime):
    subprocess.run(["textutil", "-convert", "txt", "-output", str(RAW), str(RTF)], check=True)
if RAW.exists():
    game = json.loads(RAW.read_text()); seen = {}
    for g in game:
        icon = re.sub(r"^icon-skill-tree-|-0\.png$", "", g["Icon"], flags=re.I)
        seen.setdefault(g["Name"], dict(name=g["Name"], kind=KIND[g["Kind"]], icon=icon, effect=[r["Text"] for r in g.get("Rows", [])], count=0))["count"] += 1
    cat = seen
    (ROOT / "public/assets/icons").mkdir(parents=True, exist_ok=True)
    for c in cat.values():
        f = ROOT / f"public/assets/icons/{c['icon']}.png"
        if not f.exists() or f.stat().st_size < 50:
            try:
                req = urllib.request.Request(f"https://mythfall.wiki.gg/images/Icon-skill-tree-{c['icon']}-0.png", headers={"User-Agent": "Mozilla/5.0 (Macintosh)"})
                f.write_bytes(urllib.request.urlopen(req, timeout=25).read())
            except Exception as e: report.append(f"icon for {c['name']} could not be downloaded: {e}")
    print("using game data:", len(game), "nodes")
lay = json.loads((ROOT / "source/layout.json").read_text())
slug = lambda s: re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
num = lambda n: ("m" if n < 0 else "") + str(abs(n))
xs = [n["i"] for n in lay["nodes"]]; ys = [n["j"] for n in lay["nodes"]]
x0, y0 = min(xs), min(ys)
W = (max(xs) - x0) * PITCH + 2 * MARGIN; H = (max(ys) - y0) * PITCH + 2 * MARGIN
nodes, byij = [], {}
placed = {}
for n in lay["nodes"]:
    if n["name"] not in cat: report.append(f"layout node '{n['name']}' no longer exists in the game data (renamed or removed): drop/rename it in source/layout.json"); continue
    placed[n["name"]] = placed.get(n["name"], 0) + 1
for name, c in cat.items():
    have = placed.get(name, 0); want = c.get("count", have)
    if have != want: report.append(f"'{name}': game data has {want}, layout has {have}: add/remove it in source/layout.json")
for n in lay["nodes"]:
    if n["name"] not in cat: continue
    c = cat[n["name"]]
    nid = slug(c["name"]) if c["kind"] != "travel" else f"{slug(c['name'])}-c{num(n['i'])}r{num(n['j'])}"
    rec = dict(id=nid, name=c["name"], kind=c["kind"], icon=f"assets/icons/{c['icon']}.png", effect=c["effect"],
               x=(n["i"] - x0) * PITCH + MARGIN, y=(n["j"] - y0) * PITCH + MARGIN)
    if c["kind"] == "travel": rec["framed"] = c["icon"] in FRAMED
    nodes.append(rec); byij[(n["i"], n["j"])] = nid
edges = [[byij[(a, b)], byij[(c, d)]] for a, b, c, d in lay["edges"] if (a, b) in byij and (c, d) in byij]
assert len({n["id"] for n in nodes}) == len(nodes)
out = dict(source="https://mythfall.wiki.gg/wiki/Skill_Tree (patch v0.21.0) for names/effects/icons; layout from in-game screenshots",
           pitch=PITCH, world=dict(width=W, height=H), nodes=nodes, edges=edges)
(ROOT / "public/data/tree.json").write_text(json.dumps(out, separators=(",", ":")))
print(len(nodes), "nodes", len(edges), "edges", W, "x", H)
for line in report: print("! " + line)
