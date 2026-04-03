import { useCallback, useEffect, useReducer, useRef } from "react";
import type {
  AlexTraits,
  CropCell,
  DialogueResult,
  InterventionState,
  JiaState,
  LiuState,
  LogEntry,
  Needs,
} from "../types";
import { autoPickOption, fetchFutureProposal } from "../lib/intervention";
import {
  evolveAlex,
  evolveMia,
  initialAlexPersonality,
  initialMiaPersonality,
  type TraitWeights,
} from "../lib/personality";
import { generateThought, type ThoughtLine } from "../lib/thoughts";
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
  /** 流动商人刘 */
  liu: LiuState;
  /** 建造者佳 · 谷仓扩建 */
  jia: JiaState;
  /** 谷仓扩建里程碑是否已结算 */
  jiaBarnRewarded: boolean;
  alexPersonality: TraitWeights;
  miaPersonality: TraitWeights;
  /** 0–100：财务/优先级张力（商人等在场时上升） */
  socialTension: number;
  /** 实时思维日志（中英） */
  dailyThoughts: ThoughtLine[];
  thoughtSeed: number;
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
    liu: {
      visible: false,
      pos: 76,
      timerSec: 0,
      cooldownSec: 35 + Math.random() * 25,
    },
    jia: { barnProgress: 0 },
    jiaBarnRewarded: false,
    alexPersonality: initialAlexPersonality(),
    miaPersonality: initialMiaPersonality(),
    socialTension: 0,
    dailyThoughts: [],
    thoughtSeed: 1,
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

function pushDailyThought(s: GameSnapshot) {
  const seed = (s.thoughtSeed++ * 1103515245 + Math.floor(s.minuteOfGame * 17)) | 0;
  const line = generateThought({ minuteOfGame: s.minuteOfGame, liuVisible: s.liu.visible }, seed);
  s.dailyThoughts = [line, ...s.dailyThoughts].slice(0, 60);
}

export function useFarmGame() {
  const snap = useRef<GameSnapshot>(initialSnapshot());
  const [, force] = useReducer((x: number) => x + 1, 0);
  const runDialogueRef = useRef<() => Promise<void>>(async () => {});
  const resolvingIntervention = useRef(false);
  const thoughtAccumMs = useRef(0);

  const getCtx = useCallback(() => {
    const s = snap.current;
    return {
      day: s.day,
      season: seasonName(s),
      hour: gameHour(s),
      bond: Math.round(s.bond),
      moodA: Math.round(s.alex.social + s.alex.love) / 2,
      moodM: Math.round(s.mia.social + s.mia.love) / 2,
      socialTension: s.socialTension,
      liuVisible: s.liu.visible,
      barnProgress: s.jia.barnProgress,
      exoticCropCount: s.crops.filter((c) => c.exotic).length,
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

    const bondGain =
      0.8 +
      Math.random() * 1.8 +
      (result.meta?.source === "llm" ? 0.5 : 0) -
      (s.liu.visible ? 0.35 : 0);
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
    pushDailyThought(snap.current);
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
            else {
              c.stage = 0;
              evolveAlex(s.alexPersonality, "good_harvest");
              evolveMia(s.miaPersonality, "good_harvest");
              evolveMia(s.miaPersonality, "data_adjust");
              pushLog(s, "一块地作物收获完毕。", false);
            }
          }
        });
        if (s.jia.barnProgress < 100) {
          const p = dt * 0.000045 * s.timeScale;
          s.jia.barnProgress = Math.min(100, s.jia.barnProgress + p);
          if (s.jia.barnProgress >= 100 && !s.jiaBarnRewarded) {
            s.jiaBarnRewarded = true;
            evolveAlex(s.alexPersonality, "barn_milestone");
            pushLog(s, "佳：谷仓扩建阶段性完工。", true);
          }
        }
        if (s.liu.visible) {
          s.liu.timerSec -= (dt / 1000) * s.timeScale;
          if (s.liu.timerSec <= 0) {
            s.liu.visible = false;
            s.liu.cooldownSec = 90 + Math.random() * 90;
            evolveAlex(s.alexPersonality, "liu_departure");
            pushLog(s, "刘的车驾渐行渐远……", false);
          }
        } else {
          s.liu.cooldownSec -= (dt / 1000) * s.timeScale;
          if (s.liu.cooldownSec <= 0 && Math.random() < 0.00055 * dt) {
            s.liu.visible = true;
            s.liu.timerSec = 32 + Math.random() * 35;
            s.liu.pos = 74;
            evolveAlex(s.alexPersonality, "merchant_visit");
            evolveMia(s.miaPersonality, "merchant_visit");
            const order = [0, 1, 2, 3, 4, 5, 6, 7].sort(() => Math.random() - 0.5);
            order.slice(0, 2).forEach((i) => {
              s.crops[i]!.exotic = true;
            });
            pushLog(s, "流动商人刘驾到……带来新的种子。", true);
          }
        }
        if (s.liu.visible) {
          s.socialTension = clamp(s.socialTension + dt * 0.00006 * s.timeScale, 0, 100);
        } else {
          s.socialTension = clamp(s.socialTension - dt * 0.000025 * s.timeScale, 0, 100);
        }
        thoughtAccumMs.current += dt;
        if (thoughtAccumMs.current >= 5200 + (s.thoughtSeed % 6000)) {
          thoughtAccumMs.current = 0;
          pushDailyThought(s);
        }
        if (!s.dialogueBusy) {
          s.dialogueCooldown = Math.max(0, s.dialogueCooldown - dt / 1000);
        }
        if (s.interventionCooldownSec > 0 && s.interventionCooldownSec < 90000) {
          s.interventionCooldownSec = Math.max(0, s.interventionCooldownSec - (dt / 1000) * s.timeScale);
        }
        if (s.liu.visible) {
          s.alexPos = clamp(65 + Math.sin(s.minuteOfGame * 0.4) * 4, 58, 78);
          s.miaPos = clamp(24 + Math.sin(s.minuteOfGame * 0.15) * 2, 18, 42);
          s.liu.pos = clamp(72 + Math.sin(s.minuteOfGame * 0.25) * 1.5, 68, 78);
        } else if (Math.random() < 0.002 * s.timeScale) {
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
    if (s.liu.visible) {
      evolveMia(s.miaPersonality, "tension_finance");
      evolveAlex(s.alexPersonality, "tension_with_mia");
      s.socialTension = clamp(s.socialTension + 8, 0, 100);
    }
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
