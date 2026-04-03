import { useEffect, useMemo, useState } from "react";
import type { CropCell, DialogueResult, JiaState, LiuState } from "../types";
import { SpeechBubble } from "./SpeechBubble";

function cropEmoji(stage: number, exotic?: boolean) {
  if (exotic) {
    if (stage === 0) return "·";
    if (stage === 1) return "🌿";
    return "🌶";
  }
  if (stage === 0) return "·";
  if (stage === 1) return "🌱";
  return "🥬";
}

function cropClass(stage: number, exotic?: boolean) {
  const base =
    stage === 0 ? "crop crop--seed" : stage === 1 ? "crop crop--sprout" : "crop crop--grown";
  return exotic ? `${base} crop--exotic` : base;
}

type Props = {
  crops: CropCell[];
  alexPos: number;
  miaPos: number;
  liu: LiuState;
  jia: JiaState;
  socialCaption?: string;
  pendingDialogue: DialogueResult | undefined;
  onDialogueEnd: () => void;
};

export function FarmScene({
  crops,
  alexPos,
  miaPos,
  liu,
  jia,
  socialCaption,
  pendingDialogue,
  onDialogueEnd,
}: Props) {
  const [phase, setPhase] = useState<"idle" | "alex" | "mia">("idle");
  const heartBurstId = useMemo(
    () => (pendingDialogue ? `${pendingDialogue.alex.slice(0, 12)}-${pendingDialogue.mia.slice(0, 12)}` : ""),
    [pendingDialogue],
  );

  const hearts = useMemo(() => {
    if (!heartBurstId) return [];
    const mid = (alexPos + miaPos) / 2;
    return Array.from({ length: 7 }, (_, i) => ({
      id: `${heartBurstId}-${i}`,
      left: `${mid + (i - 3) * 2.2}%`,
      bottom: `${26 + (i % 3) * 4}%`,
      delay: `${i * 0.09}s`,
    }));
  }, [heartBurstId, alexPos, miaPos]);

  useEffect(() => {
    if (!pendingDialogue) {
      setPhase("idle");
      return;
    }
    setPhase("alex");
  }, [pendingDialogue]);

  return (
    <div className="farm" aria-label="农场场景">
      <div className="sky" />
      <div className="sun" />
      <div className="cloud cloud--1" />
      <div className="cloud cloud--2" />

      <div className="barn">
        <span className="barn-door" />
        <span className="barn-label">谷仓</span>
      </div>

      <div className="barn-build" aria-hidden>
        <div className="barn-build__scaffold" />
        <div className="builder-jia">
          <span className="jia-jacket" title="蓝图夹克" />
          <span className="jia-body" />
          <span className="char-name char-name--small">佳</span>
        </div>
        <div className="barn-build__bar" title={`谷仓扩建 ${Math.round(jia.barnProgress)}%`}>
          <div className="barn-build__fill" style={{ width: `${jia.barnProgress}%` }} />
        </div>
      </div>

      <div className="greenhouse">
        <div className="gh-roof" />
        <span className="gh-label">温室</span>
      </div>

      <div className="coop">
        <span className="coop-label">家禽舍</span>
        <div className="chickens">
          <span className="chicken">🐔</span>
          <span className="chicken">🐤</span>
          <span className="chicken">🐔</span>
        </div>
      </div>

      <div className="crops">
        {crops.map((c) => (
          <div key={c.id} className={cropClass(c.stage, c.exotic)} title={c.exotic ? "异域作物" : "作物"}>
            {cropEmoji(c.stage, c.exotic)}
          </div>
        ))}
      </div>

      {liu.visible ? (
        <div className="liu-vendor" style={{ left: `${liu.pos}%` }}>
          <span className="liu-cart" title="流动货车">
            🛒
          </span>
          <div className="liu-figure">
            <span className="liu-hat" />
            <span className="liu-coat" />
          </div>
          <span className="char-name char-name--small">刘</span>
        </div>
      ) : null}

      {socialCaption ? (
        <div className="scene-caption" role="status">
          {socialCaption}
        </div>
      ) : null}

      <div className="characters">
        <div className="character character--alex" style={{ left: `${alexPos}%` }}>
          <div className="char-body" />
          <div className="bubble-wrap">
            {pendingDialogue && (
              <SpeechBubble
                speaker="Alex"
                text={pendingDialogue.alex}
                active={phase === "alex"}
                onComplete={() => setPhase("mia")}
              />
            )}
          </div>
          <span className="char-name">Alex</span>
        </div>
        <div className="character character--mia" style={{ left: `${miaPos}%` }}>
          <div className="char-body" />
          <div className="bubble-wrap">
            {pendingDialogue && (
              <SpeechBubble
                speaker="Mia"
                text={pendingDialogue.mia}
                active={phase === "mia"}
                onComplete={() => {
                  window.setTimeout(() => {
                    onDialogueEnd();
                    setPhase("idle");
                  }, 7000);
                }}
              />
            )}
          </div>
          <span className="char-name">Mia</span>
        </div>
      </div>

      <div className="hearts-layer" aria-hidden>
        {hearts.map((h) => (
          <span key={h.id} className="heart-float" style={{ left: h.left, bottom: h.bottom, animationDelay: h.delay }}>
            💕
          </span>
        ))}
      </div>
    </div>
  );
}
