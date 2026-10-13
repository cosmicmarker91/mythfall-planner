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

## Layout
- `public/` – the whole website (deploy this folder)
- `public/data/tree.json` – skills (id, name, shape, normalized x/y/size), edges, background tile layers
- `public/assets/tiles/` – stitched high-res background; `source/` + `tools/` regenerate it
- `server.mjs` – local dev server only (not deployed)
