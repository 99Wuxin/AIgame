const DEFAULT_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

/** 首选；429 时会自动尝试 OPENROUTER_MODEL_FALLBACKS 或内置列表 */
export const DEFAULT_MODEL = "qwen/qwen3.6-plus:free";

/** 逗号分隔 env OPENROUTER_MODEL_FALLBACKS 可覆盖；顺序即尝试顺序 */
export const DEFAULT_MODEL_FALLBACKS = [
  "meta-llama/llama-3.2-3b-instruct:free",
  "google/gemma-3-4b-it:free",
  "mistralai/mistral-7b-instruct:free"
];

const RETRY_DELAY_MS = 900;
const MAX_MODEL_ATTEMPTS = 4;

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
 * @param {number} status HTTP 状态或非 200 时嵌入的 error.code
 * @param {unknown} data
 */
function isRateLimited(status, data) {
  if (status === 429) return true;
  if (!data || typeof data !== "object") return false;
  const err = /** @type {Record<string, unknown>} */ (data).error;
  if (err && typeof err === "object") {
    const code = /** @type {Record<string, unknown>} */ (err).code;
    if (code === 429 || code === "429") return true;
    const meta = /** @type {Record<string, unknown>} */ (err).metadata;
    const raw = meta && typeof meta === "object" ? /** @type {Record<string, unknown>} */ (meta).raw : null;
    const blob = `${err.message ?? ""} ${typeof raw === "string" ? raw : ""}`;
    if (/rate[- ]?limit/i.test(blob) || /temporarily rate-limited/i.test(blob)) return true;
  }
  return false;
}

/**
 * OpenRouter 返回 400 且模型 ID 已下线/拼错时，换下一个备用模型
 * @param {number} status
 * @param {unknown} data
 */
function isInvalidModelIdError(status, data) {
  if (status !== 400) return false;
  if (!data || typeof data !== "object") return false;
  const err = /** @type {Record<string, unknown>} */ (data).error;
  const msg = err && typeof err === "object" ? String(/** @type {Record<string, unknown>} */ (err).message || "") : "";
  return /not a valid model id/i.test(msg);
}

/**
 * @param {Record<string, unknown>} env
 */
function parseFallbackModels(env) {
  const raw = String(env.OPENROUTER_MODEL_FALLBACKS ?? "").trim();
  if (!raw) return [...DEFAULT_MODEL_FALLBACKS];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @param {string} primary
 * @param {string[]} fallbacks
 */
function modelChain(primary, fallbacks) {
  const out = [];
  const seen = new Set();
  for (const m of [primary, ...fallbacks]) {
    const id = m.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_MODEL_ATTEMPTS) break;
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {string} url
 * @param {string} key
 * @param {Record<string, unknown>} env
 * @param {string} model
 * @param {Array<{ role: string; content: string }>} messages
 * @param {number} maxTokens
 * @param {number} temperature
 */
async function chatOnce(url, key, env, model, messages, maxTokens, temperature) {
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
      httpStatus: res.status,
      error: msg,
      details: data ? safeJson(data) : rawText.slice(0, 600),
      data
    };
  }

  if (data && data.error) {
    const errObj = /** @type {Record<string, unknown>} */ (data).error;
    const embeddedCode =
      errObj && typeof errObj === "object" && typeof errObj.code === "number" ? errObj.code : 502;
    const msg = formatOpenRouterError(data, "Provider error");
    return {
      ok: false,
      httpStatus: embeddedCode,
      error: msg,
      details: safeJson(data),
      data
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
      httpStatus: 502,
      error: "模型未返回内容（可能限流或 provider 拒绝）",
      details: data ? safeJson(data) : rawText.slice(0, 600),
      data
    };
  }

  return {
    ok: true,
    text: String(text).trim(),
    model: data?.model || model,
    details: null,
    data: null
  };
}

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
      error: "OPENROUTER_API_KEY 未配置。本地用 .dev.vars，线上 wrangler secret put OPENROUTER_API_KEY",
      details: null
    };
  }

  const url = String(env.OPENROUTER_CHAT_URL ?? DEFAULT_CHAT_URL).replace(/\/$/, "");
  const primary = String(env.OPENROUTER_MODEL || body.model || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const fallbacks = parseFallbackModels(env);
  const chain = modelChain(primary, fallbacks);

  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const messages = rawMessages
    .filter((m) => m && typeof m.role === "string" && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content }));

  if (messages.length === 0) {
    return { ok: false, status: 400, error: "没有合法 messages", details: null };
  }

  const maxTokens = Math.min(Number(body.max_tokens) || 512, 2048);
  const temperature = body.temperature ?? 0.7;

  let lastFail = /** @type {{ status: number; error: string; details: string | null }} | null */ (null);

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    if (i > 0) await sleep(RETRY_DELAY_MS);

    const r = await chatOnce(url, key, env, model, messages, maxTokens, temperature);
    if (r.ok) {
      return { ok: true, text: r.text, model: r.model, details: null };
    }

    const status = r.httpStatus >= 400 ? r.httpStatus : 502;
    lastFail = { status, error: r.error, details: r.details };

    const tryNext =
      i < chain.length - 1 &&
      (isRateLimited(r.httpStatus, r.data) || isInvalidModelIdError(r.httpStatus, r.data));

    if (tryNext) continue;

    if (i < chain.length - 1) {
      return { ok: false, status, error: r.error, details: r.details };
    }
    break;
  }

  const suffix = `（已依次尝试：${chain.join(" → ")}）`;
  return {
    ok: false,
    status: lastFail?.status ?? 502,
    error: `${lastFail?.error ?? "请求失败"}${suffix}`,
    details: lastFail?.details ?? null
  };
}
