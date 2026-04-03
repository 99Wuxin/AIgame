import { useEffect, useMemo, useState } from "react";
import type { CropCell, DialogueResult } from "../types";
import { SpeechBubble } from "./SpeechBubble";

function cropEmoji(stage: number) {
  if (stage === 0) return "·";
  if (stage === 1) return "🌱";
  return "🥬";
}

function cropClass(stage: number) {
  if (stage === 0) return "crop crop--seed";
  if (stage === 1) return "crop crop--sprout";
  return "crop crop--grown";
}

type Props = {
  crops: CropCell[];
  alexPos: number;
  miaPos: number;
  pendingDialogue: DialogueResult | undefined;
  onDialogueEnd: () => void;
};

export function FarmScene({ crops, alexPos, miaPos, pendingDialogue, onDialogueEnd }: Props) {
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
          <div key={c.id} className={cropClass(c.stage)} title="作物">
            {cropEmoji(c.stage)}
          </div>
        ))}
      </div>

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
