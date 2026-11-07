# Mythfall Skill Tree Planner

Static website (plain HTML/CSS/JS ES modules). No framework, no dependencies, no build step.

## Run locally
`node server.mjs` → http://localhost:5173 (also serves a tiny file-backed community API).
Any static server pointed at `public/` also works.

## Deploy (Cloudflare Pages)
- Framework preset: **None**
- Build command: *(leave empty)*
- Build output directory: **`public`**
- Root directory: `/` (repo root)

On a static host the community list falls back to the visitor's own browser storage
(`server.mjs` and `/api/builds` only exist locally). Shared build links (`#s=...`) work everywhere.

## Where the data comes from (patch v0.21.0)
- **Names, effects, icons:** https://mythfall.wiki.gg/wiki/Skill_Tree (all 133 node types, 16x16 icons in `public/assets/icons/`). Transcribed in `tools/catalog.py`.
- **Layout and links:** read from in-game screenshots (`source/ref/`) → `source/layout.json` (grid column/row of each of the 188 nodes, Nomad = 0,0, plus the 211 links).
- `python3 tools/build-tree.py` merges the two into `public/data/tree.json` (the only file the site loads for tree data).
- When official data exists, replace `tree.json` (same shape: `nodes[{id,name,kind,icon,effect,x,y}]`, `edges[[a,b]]`) – nothing else needs to change.

## Rules the planner implements
- Every node costs 1 skillpoint (matches the in-game "Skillpoint Cost: 1" and 7-node "Path Cost: 7").
- Hover a node: shows the cheapest path from the nearest starting node (or from nodes you already own) and its cost.
- Only a starting node, or a node next to one you own, can be bought directly; "Purchase the whole path" buys everything on the path.
- Keystones sever connections: a path can end on a keystone but never runs through one, and an owned keystone does not open the nodes around it (its other links disappear).
- Refunding a node also refunds anything cut off from your starting node.

## Layout
- `public/` – the whole website (deploy this folder)
- `public/data/tree.json` – generated tree data
- `source/` + `tools/` – reference screenshots, node layout, wiki catalogue and the generator
- `server.mjs` – local dev server only (not deployed)
