import type { DialogueResult, Needs } from "../types";

export async function fetchFarmDialogue(payload: {
  day: number;
  season: string;
  hour: number;
  bond: number;
  moodA: number;
  moodM: number;
  alex: Needs;
  mia: Needs;
}): Promise<DialogueResult> {
  const res = await fetch("/api/farm/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      day: payload.day,
      season: payload.season,
      hour: payload.hour,
      bond: payload.bond,
      moodA: payload.moodA,
      moodM: payload.moodM,
      alexHunger: payload.alex.hunger,
      miaHunger: payload.mia.hunger
    })
  });
  const data = (await res.json()) as DialogueResult;
  return data;
}
