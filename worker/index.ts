export interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  APP_ORIGIN?: string;
}

const LOCAL_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;

  const configured = (env.APP_ORIGIN || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return LOCAL_ORIGINS.has(origin) || configured.includes(origin)
    ? origin
    : null;
}

function json(data: unknown, status = 200, origin: string | null = null): Response {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });

  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
  }

  return new Response(JSON.stringify(data), { status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = allowedOrigin(request, env);
    const requestOrigin = request.headers.get("Origin");

    if (requestOrigin && !origin) {
      return json({ error: "Origin is not allowed." }, 403);
    }

    if (request.method === "OPTIONS") {
      if (!origin) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin",
        },
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({
        status: "ok",
        service: "styfi-backend",
        model: env.GEMINI_MODEL || "gemini-3-flash-preview",
        geminiConfigured: Boolean(env.GEMINI_API_KEY),
        timestamp: new Date().toISOString(),
      }, 200, origin);
    }

    return json({ error: "Route not found." }, 404, origin);
  },
};
