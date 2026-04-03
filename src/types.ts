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
}

export interface DialogueContext {
  day: number;
  season: string;
  hour: number;
  bond: number;
  moodA: number;
  moodM: number;
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
