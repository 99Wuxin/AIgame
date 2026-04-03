import { useCallback, useEffect, useReducer, useRef } from "react";
import type { CropCell, DialogueResult, LogEntry, Needs } from "../types";
import { fetchFarmDialogue } from "../lib/farmApi";

const SEASONS = ["春", "夏", "秋", "冬"];
const MINUTES_PER_DAY = 24 * 60;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function pad2(n: number) {
  return String(Math.floor(n)).padStart(2, "0");
}

export interface GameSnapshot {
  minuteOfGame: number;
  day: number;
  seasonIndex: number;
  timeScale: number;
  paused: boolean;
  bond: number;
  alex: Needs;
  mia: Needs;
  crops: CropCell[];
  alexPos: number;
  miaPos: number;
  dialogueCooldown: number;
  dialogueBusy: boolean;
  logs: LogEntry[];
  pendingDialogue?: DialogueResult;
}

function initialSnapshot(): GameSnapshot {
  return {
    minuteOfGame: 8 * 60,
    day: 1,
    seasonIndex: 0,
    timeScale: 1,
    paused: false,
    bond: 38,
    alex: { hunger: 72, social: 55, energy: 68, love: 42 },
    mia: { hunger: 70, social: 58, energy: 65, love: 44 },
    crops: Array.from({ length: 8 }, (_, i) => ({
      id: i,
      stage: Math.floor(Math.random() * 2),
      tick: Math.random() * 80
    })),
    alexPos: 34,
    miaPos: 62,
    dialogueCooldown: 0,
    dialogueBusy: false,
    logs: []
  };
}

function gameHour(s: GameSnapshot) {
  return Math.floor(s.minuteOfGame / 60) % 24;
}

function gameMinute(s: GameSnapshot) {
  return Math.floor(s.minuteOfGame % 60);
}

function seasonName(s: GameSnapshot) {
  return SEASONS[s.seasonIndex % 4]!;
}

function pushLog(s: GameSnapshot, text: string, strong?: boolean) {
  const time = `${pad2(gameHour(s))}:${pad2(gameMinute(s))}`;
  s.logs = [{ time, text, strong }, ...s.logs].slice(0, 80);
}

export function useFarmGame() {
  const snap = useRef<GameSnapshot>(initialSnapshot());
  const [, force] = useReducer((x: number) => x + 1, 0);
  const runDialogueRef = useRef<() => Promise<void>>(async () => {});

  const getCtx = useCallback(() => {
    const s = snap.current;
    return {
      day: s.day,
      season: seasonName(s),
      hour: gameHour(s),
      bond: Math.round(s.bond),
      moodA: Math.round(s.alex.social + s.alex.love) / 2,
      moodM: Math.round(s.mia.social + s.mia.love) / 2,
      alex: { ...s.alex },
      mia: { ...s.mia }
    };
  }, []);

  const runDialogueExchange = useCallback(async () => {
    const s = snap.current;
    if (s.dialogueBusy || s.dialogueCooldown > 0) return;
    s.dialogueBusy = true;
    force();

    let result: DialogueResult;
    try {
      result = await fetchFarmDialogue(getCtx());
    } catch (e) {
      result = {
        alex: "（离线）风有点大……我听不清，你再说一次？",
        mia: "（离线）嗯，我靠近一点，我们一起听。",
        meta: { source: "local", error: String(e) }
      };
    }

    const bondGain = 0.9 + Math.random() * 1.6 + (result.meta?.source === "llm" ? 0.45 : 0);
    s.bond = clamp(s.bond + bondGain, 0, 100);
    s.alex.social = clamp(s.alex.social + 4 + Math.random() * 5, 0, 100);
    s.mia.social = clamp(s.mia.social + 4 + Math.random() * 5, 0, 100);
    s.alex.love = clamp(s.alex.love + 1.3, 0, 100);
    s.mia.love = clamp(s.mia.love + 1.3, 0, 100);

    const tag = result.meta?.source === "llm" ? "LLM" : "本地";
    pushLog(s, `Alex 与 Mia 对话 · ${tag}`, true);
    if (result.meta?.error) {
      pushLog(s, `提示：${result.meta.error}`, false);
    }

    s.pendingDialogue = result;
    force();
  }, [getCtx]);

  runDialogueRef.current = runDialogueExchange;

  const welcomeOnce = useRef(false);
  useEffect(() => {
    if (welcomeOnce.current) return;
    welcomeOnce.current = true;
    pushLog(
      snap.current,
      "欢迎来到田园心语：像素 AI 农场。Alex 与 Mia 由 LLM 驱动自主交谈，种田与需求会随时间流动。",
      true
    );
    force();
  }, []);

  useEffect(() => {
    let last = performance.now();
    let raf = 0;
    const loop = (ts: number) => {
      const dt = ts - last;
      last = ts;
      const s = snap.current;
      if (!s.paused) {
        const d = dt * s.timeScale;
        s.minuteOfGame += d / 1200;
        if (s.minuteOfGame >= MINUTES_PER_DAY) {
          s.minuteOfGame -= MINUTES_PER_DAY;
          s.day++;
          if (s.day % 7 === 0) s.seasonIndex++;
          pushLog(s, `新的一天 · 第 ${s.day} 天`, true);
        }
        const rate = 0.014 * s.timeScale;
        const dec = (o: Needs) => {
          o.hunger = clamp(o.hunger - rate * (0.85 + Math.random() * 0.35), 0, 100);
          o.social = clamp(o.social - rate * 0.48, 0, 100);
          const h = gameHour(s);
          o.energy = clamp(o.energy - rate * (0.62 + (h >= 22 || h < 6 ? 0.38 : 0)), 0, 100);
          o.love = clamp(o.love + (s.bond / 2000) * dt * 0.01, 0, 100);
        };
        dec(s.alex);
        dec(s.mia);
        s.crops.forEach((c) => {
          c.tick += dt * (0.018 + s.timeScale * 0.028);
          if (c.tick > 100) {
            c.tick = 0;
            if (c.stage < 2) c.stage++;
            else c.stage = 0;
          }
        });
        if (!s.dialogueBusy) {
          s.dialogueCooldown = Math.max(0, s.dialogueCooldown - dt / 1000);
        }
        if (Math.random() < 0.0018 * s.timeScale) {
          const mid = 42 + Math.random() * 14;
          s.alexPos = clamp(mid - 8 - Math.random() * 6, 24, 50);
          s.miaPos = clamp(mid + 8 + Math.random() * 6, 52, 76);
        }
        if (
          !s.dialogueBusy &&
          s.dialogueCooldown <= 0 &&
          Math.random() < 0.00028 * dt * s.timeScale
        ) {
          void runDialogueRef.current();
        }
      }
      force();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void runDialogueRef.current(), 2800);
    return () => clearTimeout(t);
  }, []);

  const setPaused = useCallback((p: boolean) => {
    snap.current.paused = p;
    pushLog(snap.current, p ? "时间暂停" : "时间继续");
    force();
  }, []);

  const setTimeScale = useCallback((ts: number) => {
    snap.current.timeScale = ts;
    snap.current.paused = false;
    force();
  }, []);

  const clearPendingDialogue = useCallback(() => {
    const s = snap.current;
    s.pendingDialogue = undefined;
    s.dialogueBusy = false;
    s.dialogueCooldown = 22 + Math.random() * 26;
    force();
  }, []);

  return {
    snap: snap.current,
    setPaused,
    setTimeScale,
    clearPendingDialogue
  };
}
