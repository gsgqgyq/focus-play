// FocusPlay 单域名 Worker — 挂载在 focusplay.516278.xyz
//  /api/sync          -> 用 D1 批量同步
//  其余路径           -> 反代 raw.githubusercontent 的静态文件 (repo 保持 public)
const BASE = "https://raw.githubusercontent.com/gsgqgyq/focus-play/master";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Sync-Code",
};
async function hash(c) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("ff:" + c));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    // ---- 同步 API ----
    if (url.pathname === "/api/sync") {
      if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
      const code = req.headers.get("X-Sync-Code") || "";
      if (!code || code.length < 6) return json({ error: "sync code too short" }, 400);
      const id = await hash(code);
      if (req.method === "GET") {
        const row = await env.DB.prepare("SELECT data FROM ff_data WHERE id=?").bind(id).first();
        return json(row ? JSON.parse(row.data) : null);
      }
      if (req.method === "PUT") {
        let body; try { body = await req.text(); } catch { return json({ error: "bad body" }, 400); }
        if (body.length > 512 * 1024) return json({ error: "too large" }, 413);
        await env.DB.prepare(
          "INSERT INTO ff_data (id,data,updated_at) VALUES (?,?,datetime('now')) " +
          "ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at"
        ).bind(id, body).run();
        return json({ ok: true });
      }
      return json({ error: "method" }, 405);
    }

    // ---- 静态站 ----
    let p = url.pathname;
    if (p === "/" ) p = "/index.html";
    if (p === "/focus-play/" ) p = "/focus-play/index.html";
    const target = BASE + p + url.search;
      try {
      const resp = await fetch(target, { cf: { cacheTtl: 300, cacheEverything: true } });
      if (resp.status === 404) {
        const idx = await fetch(BASE + "/index.html", { cf: { cacheEverything: true } });
        return new Response(idx.body, { status: idx.status, headers: fixHeaders(idx, "/index.html") });
      }
      return new Response(resp.body, { status: resp.status, headers: fixHeaders(resp, p) });
    } catch (e) {
      return new Response("upstream error", { status: 502 });
    }
  }
};

function mime(p) {
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  if (p.endsWith(".css")) return "text/css; charset=utf-8";
  if (p.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (p.endsWith(".json")) return "application/json; charset=utf-8";
  if (p.endsWith(".svg")) return "image/svg+xml";
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".webp")) return "image/webp";
  if (p.endsWith(".jpg")||p.endsWith(".jpeg")) return "image/jpeg";
  if (p.endsWith(".ico")) return "image/x-icon";
  if (p.endsWith(".woff2")) return "font/woff2";
  if (p.endsWith(".txt")) return "text/plain; charset=utf-8";
  return null;
}
function fixHeaders(r, p) {
  const h = new Headers(r.headers);
  h.delete("content-security-policy");
  h.delete("x-frame-options");
  const t = mime(p||"");
  if (t) h.set("Content-Type", t);
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Cache-Control", "public, max-age=300");
  return h;
}
function json(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", ...CORS } });
}