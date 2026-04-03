export interface Needs {
  hunger: number;
  social: number;
  energy: number;
  love: number;
}

export interface CropCell {
  id: number;
  stage: number;
  tick: number;
  /** 流动商人刘带来的异域种子 */
  exotic?: boolean;
}

export interface LiuState {
  visible: boolean;
  pos: number;
  timerSec: number;
  cooldownSec: number;
}

export interface JiaState {
  /** 谷仓合作扩建 0–100 */
  barnProgress: number;
}

export interface DialogueContext {
  day: number;
  season: string;
  hour: number;
  bond: number;
  moodA: number;
  moodM: number;
  socialTension?: number;
  liuVisible?: boolean;
  barnProgress?: number;
  exoticCropCount?: number;
}

export interface DialogueResult {
  alex: string;
  mia: string;
  meta: {
    source: "local" | "llm" | "fallback";
    model?: string;
    provider?: string;
    reasoning?: boolean;
    error?: string;
  };
}

export type LogEntry = { time: string; text: string; strong?: boolean };

export interface AlexTraits {
  diligence: number;
  invention: number;
}

export type InterventionOptionType = "narrative" | "system" | "personality";

export interface InterventionOption {
  id: string;
  type: InterventionOptionType;
  titleEn: string;
  titleZh: string;
  descriptionZh: string;
}

export interface FutureProposalPayload {
  options: InterventionOption[];
  appendAlex: string;
  appendMia: string;
  systemLines: string[];
  source: "llm" | "local";
}

export interface InterventionState {
  payload: FutureProposalPayload;
  endsAt: number;
}
