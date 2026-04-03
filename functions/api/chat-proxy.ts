/**
 * POST /api/chat-proxy → 转发到 OpenRouter chat/completions
 * Pages Secret: OPENROUTER_API_KEY
 */

type Env = {
  OPENROUTER_API_KEY?: string;
};

const UPSTREAM = "https://openrouter.ai/api/v1/chat/completions";

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const key = context.env.OPENROUTER_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY is not set in Pages secrets" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const body = await context.request.text();
  const url = new URL(context.request.url);
  const origin = url.origin;

  const upstream = await fetch(UPSTREAM, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": origin,
      "X-Title": "田园心语",
    },
    body,
  });

  const ct = upstream.headers.get("Content-Type") || "application/json; charset=utf-8";
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": ct,
    },
  });
}
