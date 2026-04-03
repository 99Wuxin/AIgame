export type ThoughtAgent = "alex" | "mia" | "liu" | "jia";

export interface ThoughtContext {
  minuteOfGame: number;
  liuVisible: boolean;
}

export interface ThoughtLine {
  agent: ThoughtAgent;
  zh: string;
  en: string;
  time: string;
}

const ALEX_THOUGHTS: { zh: string; en: string }[] = [
  { zh: "正在核对池塘水位记录……", en: "Analyzed water levels at the pond." },
  { zh: "考虑把羊圈预算往后挪一周。", en: "Considering delaying the sheepfold budget by one week." },
  { zh: "在脑中复盘昨天的灌溉时间表。", en: "Replaying yesterday's irrigation schedule in mind." },
  { zh: "怀疑刘给的肥料报价是否偏高。", en: "Wondering if Liu's fertilizer quote is too high." },
];

const MIA_THOUGHTS: { zh: string; en: string }[] = [
  { zh: "决定先去收集鸡蛋。", en: "Decided to collect eggs first." },
  { zh: "根据气温调整温室通风计划。", en: "Adjusting greenhouse ventilation from temperature data." },
  { zh: "在估算若养羊，冬季干草要囤多少。", en: "Estimating winter hay if we add sheep." },
  { zh: "注意到 Alex 和刘聊得太投入……有点在意开销。", en: "Noticing Alex deep in talk with Liu — uneasy about spending." },
];

const LIU_THOUGHTS: { zh: string; en: string }[] = [
  { zh: "盘算这批异域种子的利润率。", en: "Calculating margins on exotic seed stock." },
  { zh: "准备推销特制有机肥给 Alex。", en: "Preparing to pitch specialty compost to Alex." },
];

const JIA_THOUGHTS: { zh: string; en: string }[] = [
  { zh: "检查谷仓扩建梁木尺寸。", en: "Checking beam dimensions for barn extension." },
  { zh: "等 Mia 确认动物容量再封屋顶。", en: "Waiting for Mia's headcount before roofing." },
];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]!;
}

export function generateThought(s: ThoughtContext, seed: number): ThoughtLine {
  const time = `${String(Math.floor((s.minuteOfGame / 60) % 24)).padStart(2, "0")}:${String(Math.floor(s.minuteOfGame % 60)).padStart(2, "0")}`;
  const agents: ThoughtAgent[] = ["alex", "mia", "jia"];
  if (s.liuVisible) agents.push("liu");

  const agent = pick(agents, seed);
  let pair: { zh: string; en: string };
  if (agent === "alex") pair = pick(ALEX_THOUGHTS, seed >> 3);
  else if (agent === "mia") pair = pick(MIA_THOUGHTS, seed >> 5);
  else if (agent === "liu") pair = pick(LIU_THOUGHTS, seed >> 2);
  else pair = pick(JIA_THOUGHTS, seed >> 4);

  return { agent, zh: pair.zh, en: pair.en, time };
}
