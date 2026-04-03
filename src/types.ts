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
