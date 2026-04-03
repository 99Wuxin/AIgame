/** 进化性个性：由数值权重生成中英描述 */

export type TraitWeights = Record<string, number>;

const ALEX_LABELS: Record<string, { zh: string; en: string }> = {
  diligent: { zh: "勤劳", en: "diligent" },
  loyal: { zh: "忠诚", en: "loyal" },
  cautious: { zh: "谨慎的规划者", en: "a cautious planner" },
  commerce: { zh: "商业头脑", en: "commerce-minded" },
  anxious: { zh: "易焦虑", en: "anxious about costs" },
};

const MIA_LABELS: Record<string, { zh: string; en: string }> = {
  caring: { zh: "充满爱心", en: "loving" },
  observant: { zh: "观察力敏锐", en: "observant" },
  resourceful: { zh: "足智多谋", en: "resourceful" },
  strategic: { zh: "善于规划数据", en: "data-driven in farm ops" },
  jealous: { zh: "对财务敏感", en: "sensitive to spending" },
};

export function initialAlexPersonality(): TraitWeights {
  return { diligent: 72, loyal: 68, cautious: 70, commerce: 42, anxious: 35 };
}

export function initialMiaPersonality(): TraitWeights {
  return { caring: 74, observant: 69, resourceful: 64, strategic: 58, jealous: 32 };
}

function topTraits(w: TraitWeights, n: number): string[] {
  return Object.entries(w)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

export function describePersonality(
  w: TraitWeights,
  labels: Record<string, { zh: string; en: string }>,
): { lineZh: string; lineEn: string } {
  const keys = topTraits(w, 3);
  const zh = keys.map((k) => labels[k]?.zh ?? k).join("，");
  const en = keys.map((k) => labels[k]?.en ?? k).join(", ");
  return {
    lineZh: `Personality：${zh}。`,
    lineEn: `Personality: ${en}.`,
  };
}

export function describeAlexPersonality(w: TraitWeights) {
  return describePersonality(w, ALEX_LABELS);
}

export function describeMiaPersonality(w: TraitWeights) {
  return describePersonality(w, MIA_LABELS);
}

export function evolveAlex(
  w: TraitWeights,
  event: "merchant_visit" | "good_harvest" | "liu_departure" | "barn_milestone" | "tension_with_mia",
): void {
  if (event === "merchant_visit") {
    w.commerce = Math.min(100, (w.commerce ?? 50) + 6);
    w.anxious = Math.min(100, (w.anxious ?? 40) + 4);
  }
  if (event === "good_harvest") {
    w.diligent = Math.min(100, (w.diligent ?? 60) + 3);
  }
  if (event === "liu_departure") {
    w.cautious = Math.min(100, (w.cautious ?? 60) + 2);
  }
  if (event === "barn_milestone") {
    w.loyal = Math.min(100, (w.loyal ?? 60) + 4);
  }
  if (event === "tension_with_mia") {
    w.anxious = Math.min(100, (w.anxious ?? 40) + 5);
    w.cautious = Math.min(100, (w.cautious ?? 60) + 3);
  }
}

export function evolveMia(
  w: TraitWeights,
  event: "merchant_visit" | "good_harvest" | "data_adjust" | "tension_finance",
): void {
  if (event === "merchant_visit") {
    w.observant = Math.min(100, (w.observant ?? 60) + 4);
    w.jealous = Math.min(100, (w.jealous ?? 30) + 5);
  }
  if (event === "good_harvest") {
    w.resourceful = Math.min(100, (w.resourceful ?? 60) + 4);
    w.strategic = Math.min(100, (w.strategic ?? 50) + 3);
  }
  if (event === "data_adjust") {
    w.strategic = Math.min(100, (w.strategic ?? 50) + 5);
  }
  if (event === "tension_finance") {
    w.jealous = Math.min(100, (w.jealous ?? 30) + 6);
    w.caring = Math.max(0, (w.caring ?? 70) - 2);
  }
}
