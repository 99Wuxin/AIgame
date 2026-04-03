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

export interface DialogueResult {
  alex: string;
  mia: string;
  meta: { source: "llm" | "local"; model?: string; error?: string };
}

export type LogEntry = { time: string; text: string; strong?: boolean };
