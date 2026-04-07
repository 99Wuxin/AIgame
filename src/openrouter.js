const DEFAULT_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_MODEL = "qwen/qwen3.6-plus:free";

/**
 * @param {Record<string, unknown>} env
 * @param {{ messages: Array<{ role: string; content: string }>; model?: string; max_tokens?: number; temperature?: number }} body
 */
export async function openRouterChat(env, body) {
  const key = String(env.OPENROUTER_API_KEY ?? "").trim();
  if (!key) {
    return {
      ok: false,
      status: 501,
      error: "OPENROUTER_API_KEY 未配置。本地用 .dev.vars，线上 wrangler secret put OPENROUTER_API_KEY"
    };
  }

  const url = String(env.OPENROUTER_CHAT_URL ?? DEFAULT_CHAT_URL).replace(/\/$/, "");
  const model = body.model || DEFAULT_MODEL;
  const messages = Array.isArray(body.messages) ? body.messages : [];

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": env.OPENROUTER_HTTP_REFERER || "https://statutebill.com",
      "X-Title": env.OPENROUTER_APP_TITLE || "Aigame ChatBot"
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: body.max_tokens ?? 1200,
      temperature: body.temperature ?? 0.7
    })
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg = data?.error?.message || data?.message || res.statusText || "OpenRouter 请求失败";
    return { ok: false, status: res.status, error: String(msg) };
  }

  const msg = data?.choices?.[0]?.message;
  let text = "";
  if (typeof msg?.content === "string") text = msg.content;
  else if (Array.isArray(msg?.content)) {
    text = msg.content.map((p) => (typeof p?.text === "string" ? p.text : "")).join("");
  }

  return {
    ok: true,
    text: text.trim(),
    model: data?.model || model
  };
}
