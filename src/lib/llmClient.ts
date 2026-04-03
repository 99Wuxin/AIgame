/**
 * 共享的 OpenRouter / 代理 chat/completions 请求（供对话与未来提案复用）
 */
import { DEFAULT_MODEL, isOpenRouterProxyBuild, STORAGE_BASE, STORAGE_KEY, STORAGE_MODEL } from "./openrouter";

const DEFAULT_BASE = "https://openrouter.ai/api/v1";

function isOpenRouterBase(baseUrl: string): boolean {
  return /openrouter\.ai/i.test(baseUrl);
}

export async function postChatCompletions(body: Record<string, unknown>): Promise<{
  choices?: Array<{ message?: { content?: string } }>;
  model?: string;
}> {
  const storageBase = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_BASE) : null;
  const useCfProxy = isOpenRouterProxyBuild() && !storageBase;
  const apiKey = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) ?? "" : "";
  const baseUrl = (storageBase || DEFAULT_BASE).replace(/\/$/, "");
  const model = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_MODEL) ?? DEFAULT_MODEL : DEFAULT_MODEL;

  if (!useCfProxy && !apiKey) {
    throw new Error("no_api_key");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (!useCfProxy && apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  if ((isOpenRouterBase(baseUrl) || useCfProxy) && typeof window !== "undefined" && window.location?.origin) {
    headers["HTTP-Referer"] = window.location.origin;
    headers["X-Title"] = "田园心语";
  }

  const url = useCfProxy
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/chat-proxy`
    : `${baseUrl}/chat/completions`;

  const payload = { ...body, model: (body.model as string) || model };
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || res.statusText);
  }
  return res.json();
}

export function canUseLlm(): boolean {
  const storageBase = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_BASE) : null;
  const useCfProxy = isOpenRouterProxyBuild() && !storageBase;
  const apiKey = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) ?? "" : "";
  return useCfProxy || !!apiKey;
}
