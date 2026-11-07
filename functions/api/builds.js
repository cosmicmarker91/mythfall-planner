// Community builds on Cloudflare Pages Functions + KV (both have a free tier; no card needed).
// Needs one KV binding named BUILDS (see README). Same API as server.mjs: GET /api/builds, POST /api/builds.
const KEY = "builds", MAX = 500;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export async function onRequestGet({ env }) {
  if (!env.BUILDS) return json({ error: "KV binding BUILDS missing" }, 501);
  const all = JSON.parse((await env.BUILDS.get(KEY)) || "[]");
  return json(all.slice(-200).reverse());
}

export async function onRequestPost({ request, env }) {
  if (!env.BUILDS) return json({ error: "KV binding BUILDS missing" }, 501);
  if (Number(request.headers.get("content-length") || 0) > 100_000) return json({ error: "too large" }, 413);
  let b; try { b = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const name = String(b.name || "").trim().slice(0, 40);
  const skills = Array.isArray(b.skills) ? b.skills.filter((s) => typeof s === "string" && s.length <= 64).slice(0, 500) : null;
  if (!name || !skills || !skills.length) return json({ error: "name and skills required" }, 400);
  const build = { id: crypto.randomUUID().slice(0, 10), name, skills, createdAt: new Date().toISOString() };
  const all = JSON.parse((await env.BUILDS.get(KEY)) || "[]"); all.push(build);
  await env.BUILDS.put(KEY, JSON.stringify(all.slice(-MAX)));
  return json(build, 201);
}
