// FocusPlay 同步 API (D1)
// GET  /api/sync  (header X-Sync-Code) -> {data}
// PUT  /api/sync  (header X-Sync-Code, body JSON) -> save
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Sync-Code",
};

async function hash(code) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("ff:" + code));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const url = new URL(req.url);
    if (url.pathname !== "/api/sync") return new Response("not found", { status: 404 });

    const code = req.headers.get("X-Sync-Code") || "";
    if (!code || code.length < 6) return json({ error: "sync code too short (min 6 chars)" }, 400);
    const id = await hash(code);

    if (req.method === "GET") {
      const row = await env.DB.prepare("SELECT data FROM ff_data WHERE id=?").bind(id).first();
      return json(row ? JSON.parse(row.data) : null);
    }
    if (req.method === "PUT") {
      let body;
      try { body = await req.text(); } catch { return json({ error: "bad body" }, 400); }
      if (body.length > 512 * 1024) return json({ error: "too large" }, 413);
      await env.DB.prepare(
        "INSERT INTO ff_data (id,data,updated_at) VALUES (?,?,datetime('now')) " +
        "ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at"
      ).bind(id, body).run();
      return json({ ok: true });
    }
    return json({ error: "method" }, 405);
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}