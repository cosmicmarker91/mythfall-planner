#!/usr/bin/env python3
"""source/layout.json (positions + links read from screenshots) + catalog.py (wiki text/icons) -> public/data/tree.json"""
import json, re, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from catalog import catalog
PITCH = 50
MARGIN = 90
FRAMED = {"strength", "dexterity", "willpower", "defense", "vitality", "speed", "critical", "luck"}   # travel nodes drawn inside a small diamond frame
cat = {c["name"]: c for c in catalog()}
lay = json.loads((ROOT / "source/layout.json").read_text())
slug = lambda s: re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
num = lambda n: ("m" if n < 0 else "") + str(abs(n))
xs = [n["i"] for n in lay["nodes"]]; ys = [n["j"] for n in lay["nodes"]]
x0, y0 = min(xs), min(ys)
W = (max(xs) - x0) * PITCH + 2 * MARGIN; H = (max(ys) - y0) * PITCH + 2 * MARGIN
nodes, byij = [], {}
for n in lay["nodes"]:
    c = cat[n["name"]]
    nid = slug(c["name"]) if c["kind"] != "travel" else f"{slug(c['name'])}-c{num(n['i'])}r{num(n['j'])}"
    rec = dict(id=nid, name=c["name"], kind=c["kind"], icon=f"assets/icons/{c['icon']}.png", effect=c["effect"],
               x=(n["i"] - x0) * PITCH + MARGIN, y=(n["j"] - y0) * PITCH + MARGIN)
    if c["kind"] == "travel": rec["framed"] = c["icon"] in FRAMED
    nodes.append(rec); byij[(n["i"], n["j"])] = nid
edges = [[byij[(a, b)], byij[(c, d)]] for a, b, c, d in lay["edges"]]
assert len({n["id"] for n in nodes}) == len(nodes)
out = dict(source="https://mythfall.wiki.gg/wiki/Skill_Tree (patch v0.21.0) for names/effects/icons; layout from in-game screenshots",
           pitch=PITCH, world=dict(width=W, height=H), nodes=nodes, edges=edges)
(ROOT / "public/data/tree.json").write_text(json.dumps(out, separators=(",", ":")))
print(len(nodes), "nodes", len(edges), "edges", W, "x", H)
