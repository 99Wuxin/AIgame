import type { DialogueContext, FutureProposalPayload, InterventionOption, InterventionOptionType } from "../types";
import { canUseLlm, postChatCompletions } from "./llmClient";

function parseProposalJson(raw: string): FutureProposalPayload | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const p = JSON.parse(m[0]) as {
      options?: Array<{
        id?: string;
        type?: string;
        titleEn?: string;
        titleZh?: string;
        descriptionZh?: string;
      }>;
      appendAlex?: string;
      appendMia?: string;
      systemLines?: string[];
    };
    const opts = (p.options ?? [])
      .slice(0, 3)
      .map((o, i) => ({
        id: String(o.id ?? ["a", "b", "c"][i] ?? i),
        type: (["narrative", "system", "personality"] as const).includes(o.type as InterventionOptionType)
          ? (o.type as InterventionOptionType)
          : (["narrative", "system", "personality"] as const)[i % 3]!,
        titleEn: String(o.titleEn ?? "").slice(0, 80),
        titleZh: String(o.titleZh ?? "").slice(0, 40),
        descriptionZh: String(o.descriptionZh ?? "").slice(0, 200),
      }))
      .filter((o) => o.titleZh && o.descriptionZh);
    if (opts.length < 3) return null;
    return {
      options: opts as InterventionOption[],
      appendAlex: String(p.appendAlex ?? "").slice(0, 200),
      appendMia: String(p.appendMia ?? "").slice(0, 200),
      systemLines: (p.systemLines ?? []).slice(0, 5).map((s) => String(s).slice(0, 300)),
      source: "llm",
    };
  } catch {
    return null;
  }
}

function localProposal(ctx: DialogueContext): FutureProposalPayload {
  const seed = ctx.day + ctx.bond + ctx.hour;
  const narrative: InterventionOption = {
    id: "n1",
    type: "narrative",
    titleEn: "Mysterious Traveller",
    titleZh: "神秘旅者",
    descriptionZh:
      "接待一位神秘学者。可能揭示古代农业知识，也可能引来不必要的麻烦与流言。",
  };
  const system: InterventionOption = {
    id: "s1",
    type: "system",
    titleEn: "Crop Diversity Initiative",
    titleZh: "作物多样性倡议",
    descriptionZh:
      "颁布一项试验性政策：改变部分田块的产量计算方式，鼓励轮作与混种。",
  };
  const personality: InterventionOption = {
    id: "p1",
    type: "personality",
    titleEn: "Encourage Alex's Creativity",
    titleZh: "激发亚历克斯的创造力",
    descriptionZh:
      "为 Alex 提供材料建造独特的稻草人，可能降低「勤劳」、提升「发明」类特质。",
  };
  const opts = [narrative, system, personality];
  const rot = seed % 3;
  const options = [opts[rot]!, opts[(rot + 1) % 3]!, opts[(rot + 2) % 3]!];

  return {
    options,
    appendAlex:
      seed % 2 === 0
        ? "我在想……若真有那位旅者说的古老灌溉法，谷仓旁那块地也许该先试一小片。"
        : "新政策听起来冒险，但若 Mia 也赞成，我愿意先改两垄地试试。",
    appendMia:
      seed % 2 === 0
        ? "羊圈扩建若和轮作一起规划，或许能少占一点好地——我们今晚把草图摊开？"
        : "那位陌生人带来的地图……我总觉得温室背面的土味不太一样了。",
    systemLines: [
      `[SYSTEM] Local sim: irrigation trial queued (bond=${ctx.bond}).`,
      `[SYSTEM] Local sim: sheepfold plan referenced (season=${ctx.season}).`,
      `[SYSTEM] Local sim: soil tag near greenhouse → 'watch'.`,
    ],
    source: "local",
  };
}

export async function fetchFutureProposal(ctx: DialogueContext): Promise<FutureProposalPayload> {
  if (!canUseLlm()) {
    return localProposal(ctx);
  }

  const system = `你是农场模拟游戏的系统策划。只输出 JSON，不要 markdown。
必须包含恰好 3 个选项，类型分别为 narrative、system、personality（顺序任意）。
每个选项含：id（短字符串）、type、titleEn、titleZh、descriptionZh（中文 40–90 字）。
另输出 appendAlex、appendMia：两人对话中新增的「讨论内容」各一句中文（可与养羊、政策、旅者相关）。
另输出 systemLines：字符串数组，恰好 3 条，以 [SYSTEM] 开头，英文为主，描述 LLM 对规则/物理/社会结构的动态改写（可含中文专名）。
输出格式示例：
{"options":[{"id":"a","type":"narrative","titleEn":"...","titleZh":"...","descriptionZh":"..."}],"appendAlex":"...","appendMia":"...","systemLines":["[SYSTEM] ...","[SYSTEM] ...","[SYSTEM] ..."]}`;

  const user = JSON.stringify({
    季节: ctx.season,
    第几天: ctx.day,
    时刻: `${ctx.hour}:00`,
    亲密度: ctx.bond,
    Alex综合: ctx.moodA,
    Mia综合: ctx.moodM,
  });

  try {
    const data = await postChatCompletions({
      temperature: 0.85,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    const parsed = parseProposalJson(raw);
    if (parsed && parsed.systemLines.length >= 3) {
      return { ...parsed, source: "llm" };
    }
  } catch (e) {
    console.warn("future proposal LLM failed:", e);
  }
  return localProposal(ctx);
}

/** 超时未选时按 NPC「个性」自动选：Alex 偏 system，Mia 偏 narrative，默认 personality */
export function autoPickOption(options: InterventionOption[]): InterventionOption {
  const narrative = options.find((o) => o.type === "narrative");
  const system = options.find((o) => o.type === "system");
  const personality = options.find((o) => o.type === "personality");
  const r = Math.random();
  if (r < 0.33 && narrative) return narrative;
  if (r < 0.66 && system) return system;
  return personality ?? narrative ?? system ?? options[0]!;
}
