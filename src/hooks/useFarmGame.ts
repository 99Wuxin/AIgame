import { useCallback, useEffect, useReducer, useRef } from "react";
import type {
  AlexTraits,
  CropCell,
  DialogueResult,
  InterventionState,
  LogEntry,
  Needs,
} from "../types";
import { autoPickOption, fetchFutureProposal } from "../lib/intervention";
import { generateAgentDialogue } from "../lib/openrouter";

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
  pendingAppend?: { alex: string; mia: string } | null;
  alexTraits: AlexTraits;
  soilGreenhouse: string;
  cropPolicy: string | null;
  systemLog: string[];
  intervention: InterventionState | null;
  interventionLoading: boolean;
  interventionCooldownSec: number;
}

function initialSnapshot(): GameSnapshot {
  return {
    minuteOfGame: 8 * 60,
    day: 1,
    seasonIndex: 0,
    timeScale: 1,
    paused: false,
    bond: 35,
    alex: { hunger: 72, social: 55, energy: 68, love: 40 },
    mia: { hunger: 70, social: 58, energy: 65, love: 42 },
    crops: Array.from({ length: 8 }, (_, i) => ({
      id: i,
      stage: Math.floor(Math.random() * 3),
      tick: Math.random() * 100,
    })),
    alexPos: 32,
    miaPos: 58,
    dialogueCooldown: 0,
    dialogueBusy: false,
    logs: [],
    pendingAppend: null,
    alexTraits: { diligence: 62, invention: 38 },
    soilGreenhouse: "良好",
    cropPolicy: null,
    systemLog: [],
    intervention: null,
    interventionLoading: false,
    interventionCooldownSec: 10,
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
  const next = [{ time, text, strong }, ...s.logs];
  s.logs = next.slice(0, 80);
}

function pushSystemLog(s: GameSnapshot, line: string) {
  s.systemLog = [line, ...s.systemLog].slice(0, 60);
}

export function useFarmGame() {
  const snap = useRef<GameSnapshot>(initialSnapshot());
  const [, force] = useReducer((x: number) => x + 1, 0);
  const runDialogueRef = useRef<() => Promise<void>>(async () => {});
  const resolvingIntervention = useRef(false);

  const getCtx = useCallback(() => {
    const s = snap.current;
    return {
      day: s.day,
      season: seasonName(s),
      hour: gameHour(s),
      bond: Math.round(s.bond),
      moodA: Math.round(s.alex.social + s.alex.love) / 2,
      moodM: Math.round(s.mia.social + s.mia.love) / 2,
    };
  }, []);

  const applyInterventionChoice = useCallback((inv: InterventionState, optionId: string | null) => {
    const s = snap.current;
    const payload = inv.payload;
    const opt =
      optionId === null
        ? autoPickOption(payload.options)
        : payload.options.find((o) => o.id === optionId) ?? autoPickOption(payload.options);

    s.pendingAppend = { alex: payload.appendAlex, mia: payload.appendMia };
    payload.systemLines.forEach((line) => pushSystemLog(s, line));

    if (opt.type === "narrative") {
      s.bond = clamp(s.bond + 4, 0, 100);
      pushLog(s, `【介入·叙述】${opt.titleZh}`, true);
      pushSystemLog(s, `[SYSTEM] Narrative branch locked: ${opt.titleEn}.`);
    } else if (opt.type === "system") {
      s.cropPolicy = `作物多样性倡议 · 第${s.day}天`;
      s.crops.forEach((c) => {
        c.tick += 5;
      });
      pushLog(s, `【介入·系统】${opt.titleZh}`, true);
      pushSystemLog(s, `[SYSTEM] LLM approved policy: ${opt.titleEn} — yield calc adjusted.`);
    } else {
      s.alexTraits.diligence = clamp(s.alexTraits.diligence - 3, 0, 100);
      s.alexTraits.invention = clamp(s.alexTraits.invention + 6, 0, 100);
      pushLog(s, `【介入·个性】${opt.titleZh}`, true);
      pushSystemLog(s, `[SYSTEM] Alex traits shifted: diligence↓ invention↑ (${opt.titleEn}).`);
    }

    if (payload.source === "llm") {
      pushSystemLog(s, "[SYSTEM] Proposal source: LLM.");
    }

    s.soilGreenhouse = Math.random() < 0.4 ? "最优 Optimal" : s.soilGreenhouse;
    s.intervention = null;
    s.interventionCooldownSec = 48 + Math.random() * 35;
    force();
  }, []);

  const resolveInterventionIfExpired = useCallback(() => {
    const s = snap.current;
    if (!s.intervention || resolvingIntervention.current) return;
    if (Date.now() < s.intervention.endsAt) return;
    resolvingIntervention.current = true;
    applyInterventionChoice(s.intervention, null);
    resolvingIntervention.current = false;
  }, [applyInterventionChoice]);

  const chooseIntervention = useCallback(
    (id: string) => {
      const s = snap.current;
      if (!s.intervention) return;
      resolvingIntervention.current = true;
      applyInterventionChoice(s.intervention, id);
      resolvingIntervention.current = false;
    },
    [applyInterventionChoice],
  );

  const startIntervention = useCallback(async () => {
    const s = snap.current;
    if (s.intervention || s.interventionLoading || s.dialogueBusy) return;
    s.interventionLoading = true;
    s.interventionCooldownSec = 99999;
    force();
    try {
      const payload = await fetchFutureProposal(getCtx());
      s.intervention = { payload, endsAt: Date.now() + 30000 };
    } catch (e) {
      console.warn(e);
      s.interventionCooldownSec = 25;
    } finally {
      s.interventionLoading = false;
      if (!s.intervention) {
        s.interventionCooldownSec = Math.min(s.interventionCooldownSec, 30);
      }
      force();
    }
  }, [getCtx]);

  const runDialogueExchange = useCallback(async () => {
    const s = snap.current;
    if (s.dialogueBusy || s.dialogueCooldown > 0) return;
    s.dialogueBusy = true;
    force();

    const result: DialogueResult = await generateAgentDialogue(getCtx());

    let alex = result.alex;
    let mia = result.mia;
    if (s.pendingAppend) {
      alex += `\n\nNEW: ${s.pendingAppend.alex}`;
      mia += `\n\nNEW: ${s.pendingAppend.mia}`;
      s.pendingAppend = null;
    }

    const bondGain = 0.8 + Math.random() * 1.8 + (result.meta?.source === "llm" ? 0.5 : 0);
    s.bond = clamp(s.bond + bondGain, 0, 100);
    s.alex.social = clamp(s.alex.social + 4 + Math.random() * 6, 0, 100);
    s.mia.social = clamp(s.mia.social + 4 + Math.random() * 6, 0, 100);
    s.alex.love = clamp(s.alex.love + 1.2, 0, 100);
    s.mia.love = clamp(s.mia.love + 1.2, 0, 100);

    const src = result.meta?.source === "llm" ? "（真实 LLM）" : "（本地 AI）";
    pushLog(s, `Alex 与 Mia 深度交谈 ${src}`, true);

    s.pendingDialogue = { ...result, alex, mia };
    force();
  }, [getCtx]);

  runDialogueRef.current = runDialogueExchange;

  const welcomeOnce = useRef(false);
  useEffect(() => {
    if (welcomeOnce.current) return;
    welcomeOnce.current = true;
    pushLog(snap.current, "欢迎来到田园心语。Alex 与 Mia 正在农场生活，自主对话即将开始……", true);
    pushSystemLog(snap.current, "[SYSTEM] Session init — player intervention window 30s when proposal active.");
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
          pushLog(s, `新的一天：第 ${s.day} 天`, true);
        }
        const rate = 0.015 * s.timeScale;
        const dec = (o: Needs) => {
          o.hunger = clamp(o.hunger - rate * (0.8 + Math.random() * 0.4), 0, 100);
          o.social = clamp(o.social - rate * 0.5, 0, 100);
          const h = gameHour(s);
          o.energy = clamp(o.energy - rate * (0.6 + (h >= 22 || h < 6 ? 0.4 : 0)), 0, 100);
          o.love = clamp(o.love + (s.bond / 2000) * dt * 0.01, 0, 100);
        };
        dec(s.alex);
        dec(s.mia);
        s.crops.forEach((c) => {
          c.tick += dt * (0.02 + s.timeScale * 0.03);
          if (c.tick > 100) {
            c.tick = 0;
            if (c.stage < 2) c.stage++;
            else c.stage = 0;
          }
        });
        if (!s.dialogueBusy) {
          s.dialogueCooldown = Math.max(0, s.dialogueCooldown - dt / 1000);
        }
        if (s.interventionCooldownSec > 0 && s.interventionCooldownSec < 90000) {
          s.interventionCooldownSec = Math.max(0, s.interventionCooldownSec - (dt / 1000) * s.timeScale);
        }
        if (Math.random() < 0.002 * s.timeScale) {
          const mid = 42 + Math.random() * 16;
          s.alexPos = clamp(mid - 8 - Math.random() * 6, 22, 48);
          s.miaPos = clamp(mid + 6 + Math.random() * 6, 52, 78);
        }
        if (
          !s.dialogueBusy &&
          s.dialogueCooldown <= 0 &&
          Math.random() < 0.00032 * dt * s.timeScale
        ) {
          void runDialogueRef.current();
        }

        resolveInterventionIfExpired();

        if (
          !s.intervention &&
          !s.interventionLoading &&
          !s.dialogueBusy &&
          s.interventionCooldownSec <= 0
        ) {
          void startIntervention();
        }
      }
      force();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [resolveInterventionIfExpired, startIntervention]);

  useEffect(() => {
    const t = window.setTimeout(() => void runDialogueRef.current(), 2500);
    return () => clearTimeout(t);
  }, []);

  const setPaused = useCallback((p: boolean) => {
    snap.current.paused = p;
    pushLog(snap.current, p ? "时间已暂停" : "时间继续流动");
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
    s.dialogueCooldown = 24 + Math.random() * 28;
    force();
  }, []);

  const cur = snap.current;
  const remainingInterventionSec = cur.intervention
    ? Math.max(0, Math.ceil((cur.intervention.endsAt - Date.now()) / 1000))
    : 0;

  return {
    snap: cur,
    remainingInterventionSec,
    chooseIntervention,
    setPaused,
    setTimeScale,
    clearPendingDialogue,
  };
}
