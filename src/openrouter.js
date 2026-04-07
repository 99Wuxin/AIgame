const DEFAULT_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

/** 固定使用此模型；不读客户端 model，不设备用链 */
export const DEFAULT_MODEL = "stepfun/step-3.5-flash:free";

/**
 * 把 OpenRouter / 上游 provider 的报错拼成可读字符串
 * @param {unknown} data
 * @param {string} [fallback]
 */
export function formatOpenRouterError(data, fallback) {
  if (!data || typeof data !== "object") return fallback || "OpenRouter 返回无法解析";

  const err = /** @type {Record<string, unknown>} */ (data).error;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const o = /** @type {Record<string, unknown>} */ (err);
    const bits = [
      o.message,
      o.type,
      o.code,
      typeof o.metadata === "object" && o.metadata !== null
        ? safeJson(o.metadata)
        : o.metadata
    ].filter((x) => x != null && String(x).length > 0);
    if (bits.length) return bits.map(String).join(" · ");
  }

  if (typeof data.message === "string") return data.message;

  try {
    const s = JSON.stringify(data);
    return s.length > 800 ? `${s.slice(0, 800)}…` : s;
  } catch {
    return fallback || "Unknown error";
  }
}

function safeJson(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

/**
 * @param {Record<string, unknown>} env
 * @param {{ messages: Array<{ role: string; content: string }>; max_tokens?: number; temperature?: number }} body
 */
export async function openRouterChat(env, body) {
  const key = String(env.OPENROUTER_API_KEY ?? "").trim();
  if (!key) {
    return {
      ok: false,
      status: 501,
      error: "OPENROUTER_API_KEY 未配置。本地用 .dev.vars，线上 wrangler secret put OPENROUTER_API_KEY",
      details: null
    };
  }

  const url = String(env.OPENROUTER_CHAT_URL ?? DEFAULT_CHAT_URL).replace(/\/$/, "");
  const model = String(env.OPENROUTER_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;

  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const messages = rawMessages
    .filter((m) => m && typeof m.role === "string" && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content }));

  if (messages.length === 0) {
    return { ok: false, status: 400, error: "没有合法 messages", details: null };
  }

  const maxTokens = Math.min(Number(body.max_tokens) || 512, 2048);
  const temperature = body.temperature ?? 0.7;

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
      max_tokens: maxTokens,
      temperature
    })
  });

  const rawText = await res.text();
  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg = data ? formatOpenRouterError(data, res.statusText) : rawText.slice(0, 400) || res.statusText;
    return {
      ok: false,
      status: res.status,
      error: msg,
      details: data ? safeJson(data) : rawText.slice(0, 600)
    };
  }

  if (data && data.error) {
    const errObj = /** @type {Record<string, unknown>} */ (data).error;
    const embeddedCode =
      errObj && typeof errObj === "object" && typeof errObj.code === "number" ? errObj.code : 502;
    return {
      ok: false,
      status: embeddedCode,
      error: formatOpenRouterError(data, "Provider error"),
      details: safeJson(data)
    };
  }

  const choiceMsg = data?.choices?.[0]?.message;
  let text = "";
  if (typeof choiceMsg?.content === "string") text = choiceMsg.content;
  else if (Array.isArray(choiceMsg?.content)) {
    text = choiceMsg.content.map((p) => (typeof p?.text === "string" ? p.text : "")).join("");
  }

  if (!String(text).trim() && (!data?.choices || data.choices.length === 0)) {
    return {
      ok: false,
      status: 502,
      error: "模型未返回内容（可能限流或 provider 拒绝）",
      details: data ? safeJson(data) : rawText.slice(0, 600)
    };
  }

  return {
    ok: true,
    text: String(text).trim(),
    model: data?.model || model,
    details: null
  };
}
