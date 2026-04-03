import type { DialogueContext, DialogueResult } from "../types";

const OPENINGS = [
  "今天阳光真好，",
  "刚才路过温室时我在想，",
  "你记不记得我们上次聊到",
  "农场静下来的时候，",
  "我有点好奇——",
];
const TOPICS = [
  "收成与季节",
  "心里的不安",
  "未来的小计划",
  "昨晚的梦",
  "谷仓里旧木头的味道",
  "家禽舍早晨的叫声",
];
const ALEX_LINES = [
  "我想把这边再整理一下，心里会踏实些。",
  "如果你累了，我们可以先坐一会儿。",
  "和你一起干活，时间好像会变慢。",
  "有时候我会担心说太多……但你听着，我就安心。",
  "下次我们可以在温室多待一会儿吗？",
];
const MIA_LINES = [
  "我也是，刚才还在想同样的事。",
  "听你这么说，我胸口会轻一点。",
  "那我们就一步一步来，不用急。",
  "嗯……我其实也想和你多聊一会儿。",
  "好啊，我正好也有话想告诉你。",
];
const REPLIES = ["嗯。", "我明白。", "真的吗？", "继续说。", "我在听。"];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]!;
}

export function localExchange(ctx: DialogueContext): DialogueResult {
  const { day, season, hour, bond, moodA, moodM, socialTension = 0, liuVisible, barnProgress = 0 } = ctx;
  const seed = hashString(`${day}-${season}-${hour}-${bond}-${moodA}-${moodM}-${socialTension}`);
  if (liuVisible && seed % 2 === 0) {
    const alex = `我在和刘核对进货记录，他在推销特制有机肥——我得算清楚再签字。${pick(ALEX_LINES, seed)}`;
    const mia =
      socialTension > 40
        ? `我在远处看着……若真要扩建羊圈和囤冬装羊毛，这笔开销得和收成对上。${pick(MIA_LINES, seed + 1)}`
        : `刘带来的异域种子已经下地了。我在想：若以后养羊，干草和冬装预算要怎么摊。${pick(MIA_LINES, seed + 2)}`;
    return { alex, mia, meta: { source: "local" } };
  }
  if (barnProgress > 55 && seed % 3 === 0) {
    const alex = `佳把谷仓梁木架好了（进度约 ${Math.round(barnProgress)}%）。我在想以后能多养几只，冬天就有羊毛做衣服。`;
    const mia = `数据上温室与牧草轮作可以并行——我先把「过冬计划表」写进笔记里。${pick(REPLIES, seed)}`;
    return { alex, mia, meta: { source: "local" } };
  }
  const a1 = pick(OPENINGS, seed);
  const topic = pick(TOPICS, seed + 1);
  const alex = `${a1}${topic}的时候，${pick(ALEX_LINES, seed + 2)}`;
  const mia = `${pick(MIA_LINES, seed + 3)} ${pick(REPLIES, seed + 4)}`;
  return { alex, mia, meta: { source: "local" } };
}
