/**
 * OpenRouter chat completions with optional reasoning (qwen/qwen3.6-plus:free).
 * @see https://openrouter.ai/
 */
import type { DialogueContext, DialogueResult } from "../types";
import { localExchange } from "./localDialogue";

const DEFAULT_BASE = "https://openrouter.ai/api/v1";
export const DEFAULT_MODEL = "qwen/qwen3.6-plus:free";

const STORAGE_KEY = "farm_llm_key";
const STORAGE_BASE = "farm_llm_base";
const STORAGE_MODEL = "farm_llm_model";

/** 构建时设 VITE_USE_OPENROUTER_PROXY=true，请求同源 /api/chat-proxy（Pages Function） */
export function isOpenRouterProxyBuild(): boolean {
  return import.meta.env.VITE_USE_OPENROUTER_PROXY === "true";
}

export function parseDialogueJson(raw: string | null | undefined): { alex: string; mia: string } | null {
  if (!raw || typeof raw !== "string") return null;
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as { alex?: unknown; mia?: unknown };
    const alex = String(parsed.alex ?? "").trim().slice(0, 200);
    const mia = String(parsed.mia ?? "").trim().slice(0, 200);
    if (!alex || !mia) return null;
    return { alex, mia };
  } catch {
    return null;
  }
}

function isOpenRouterBase(baseUrl: string): boolean {
  return /openrouter\.ai/i.test(baseUrl);
}

/** Assistant message may include reasoning_details from OpenRouter. */
type ApiAssistantMessage = {
  role: "assistant";
  content: string;
  reasoning_details?: unknown;
};

type ChatRole = "system" | "user" | "assistant";

type ChatMessage =
  | { role: ChatRole; content: string }
  | ({ role: "assistant"; content: string } & { reasoning_details?: unknown });

export async function generateAgentDialogue(
  ctx: DialogueContext,
  options: { apiKey?: string; baseUrl?: string; model?: string } = {},
): Promise<DialogueResult> {
  const storageBase = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_BASE) : null;
  const useCfProxy = isOpenRouterProxyBuild() && !storageBase;
  const apiKey = options.apiKey ?? localStorage.getItem(STORAGE_KEY) ?? "";
  const baseUrl = (options.baseUrl ?? (storageBase || DEFAULT_BASE)).replace(/\/$/, "");
  const model = options.model ?? localStorage.getItem(STORAGE_MODEL) ?? DEFAULT_MODEL;

  if (!useCfProxy && !apiKey) {
    return localExchange(ctx);
  }

  const system = `你是文字冒险游戏中的双角色编剧。只输出 JSON，不要 markdown。
角色：Alex（温和、略内向、体贴）、Mia（敏锐、温柔、会接话）。
场景：两人同在农场，有谷仓、温室、家禽与作物。季节与时间在上下文中。
输出格式：{"alex":"一句中文台词","mia":"一句回应中文台词"}
要求：每句 20-55 字；有情感推进；可提及农场细节；恋人未满的暧昧感。`;

  const userPayload = JSON.stringify({
    季节: ctx.season,
    第几天: ctx.day,
    时刻: `${ctx.hour}:00`,
    关系亲密度0到100: ctx.bond,
    Alex心情0到100: ctx.moodA,
    Mia心情0到100: ctx.moodM,
    社交财务张力0到100: ctx.socialTension ?? 0,
    流动商人刘是否在场: Boolean(ctx.liuVisible),
    谷仓扩建进度0到100: ctx.barnProgress ?? 0,
    异域作物地块数: ctx.exoticCropCount ?? 0,
  });

  const messagesBase: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: userPayload },
  ];

  const openRouter = isOpenRouterBase(baseUrl) || useCfProxy;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (!useCfProxy && apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  if (openRouter && typeof window !== "undefined" && window.location?.origin) {
    headers["HTTP-Referer"] = window.location.origin;
    headers["X-Title"] = "田园心语";
  }

  async function postChat(body: Record<string, unknown>) {
    const url = useCfProxy
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/chat-proxy`
      : `${baseUrl}/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || res.statusText);
    }
    return res.json() as Promise<{
      model?: string;
      choices?: Array<{ message?: { content?: string; reasoning_details?: unknown } }>;
    }>;
  }

  try {
    if (openRouter) {
      // First call: reasoning enabled (matches OpenRouter + Qwen pattern)
      const data1 = await postChat({
        model,
        temperature: 0.9,
        messages: messagesBase,
        reasoning: { enabled: true },
      });
      const msg = data1.choices?.[0]?.message;
      if (!msg) throw new Error("no assistant message");

      const assistantTurn: ApiAssistantMessage = {
        role: "assistant",
        content: msg.content ?? "",
      };
      if (msg.reasoning_details !== undefined) {
        assistantTurn.reasoning_details = msg.reasoning_details;
      }

      // Second call: continue with reasoning_details passed back unmodified
      const data2 = await postChat({
        model,
        messages: [
          ...messagesBase,
          assistantTurn,
          {
            role: "user",
            content:
              "请只输出一个 JSON 对象：{\"alex\":\"...\",\"mia\":\"...\"}。中文台词各 20–55 字；不要 markdown 代码块，不要其它说明。",
          },
        ],
      });
      const msg2 = data2.choices?.[0]?.message;
      const out =
        parseDialogueJson(msg2?.content) ||
        parseDialogueJson(typeof msg.content === "string" ? msg.content : "");
      if (!out) throw new Error("no json in OpenRouter response");
      return {
        alex: out.alex,
        mia: out.mia,
        meta: { source: "llm", model, provider: "openrouter", reasoning: true },
      };
    }

    const data = await postChat({
      model,
      temperature: 0.9,
      messages: messagesBase,
    });
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    const out = parseDialogueJson(raw);
    if (!out) throw new Error("no json");
    return { alex: out.alex, mia: out.mia, meta: { source: "llm", model: data.model ?? model } };
  } catch (e) {
    console.warn("LLM 对话失败，使用本地模拟:", e);
    const err = e instanceof Error ? e.message : String(e);
    return { ...localExchange(ctx), meta: { source: "fallback", error: err } };
  }
}

export { STORAGE_KEY, STORAGE_BASE, STORAGE_MODEL };
