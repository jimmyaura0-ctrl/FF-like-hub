
const ALLOWED_ORIGINS = new Set([
  "https://af8ceb6e.ff-like-hub.pages.dev",
  "https://ff-like-hub.pages.dev"
]);

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };

  if (ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors
      });
    }

    try {
      if (url.pathname === "/api/health" &&
          request.method === "GET") {
        await env.DB.prepare("SELECT 1 AS ok").first();

        return json({
          success: true,
          server: "online",
          database: "connected",
          service: "FF Likes Hub API",
          provider_connected: false
        }, 200, cors);
      }

      if (url.pathname === "/api/lookup" &&
          request.method === "POST") {

        const body = await request.json();
        const uid = String(body.uid || "").trim();
        const region = String(body.region || "").toUpperCase();

        if (!/^[0-9]{5,20}$/.test(uid)) {
          return json({
            success: false,
            message: "Invalid UID"
          }, 400, cors);
        }

        if (!["IND", "SG", "BR"].includes(region)) {
          return json({
            success: false,
            message: "Unsupported region"
          }, 400, cors);
        }

        const previous = await env.DB.prepare(
          `SELECT created_at
           FROM lookup_requests
           WHERE uid = ?
           ORDER BY created_at DESC
           LIMIT 1`
        ).bind(uid).first();

        if (previous &&
            Date.now() - Date.parse(previous.created_at) < 30000) {
          return json({
            success: false,
            message: "Please wait 30 seconds before trying again."
          }, 429, cors);
        }

        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();

        await env.DB.prepare(
          `INSERT INTO lookup_requests
           (id, uid, region, created_at)
           VALUES (?, ?, ?, ?)`
        ).bind(id, uid, region, createdAt).run();

        return json({
          success: true,
          request_id: id,
          uid: uid,
          region: region,
          provider_connected: false,
          likes_sent: false,
          message: "UID request saved. Player data provider is not connected yet."
        }, 202, cors);
      }

      if (url.pathname === "/api/history" &&
          request.method === "GET") {

        const uid = (url.searchParams.get("uid") || "").trim();

        if (!/^[0-9]{5,20}$/.test(uid)) {
          return json({
            success: false,
            message: "Valid UID is required"
          }, 400, cors);
        }

        const result = await env.DB.prepare(
          `SELECT likes, source, recorded_at
           FROM likes_snapshots
           WHERE uid = ?
           ORDER BY recorded_at DESC
           LIMIT 20`
        ).bind(uid).all();

        return json({
          success: true,
          uid,
          snapshots: result.results || [],
          message: "Likes history retrieved"
        }, 200, cors);
      }

      return json({
        success: false,
        message: "API route not found"
      }, 404, cors);

    } catch (error) {
      console.error("API error:", error);

      return json({
        success: false,
        message: "Internal server error"
      }, 500, cors);
    }
  }
};
