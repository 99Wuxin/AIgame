import { useCallback, useEffect, useMemo, useState } from "react";
import type { CropCell, DialogueResult } from "../types";
import { SpeechBubble } from "./SpeechBubble";

function cropGlyph(stage: number) {
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
  const burstKey = useMemo(
    () =>
      pendingDialogue ? `${pendingDialogue.alex.slice(0, 10)}-${pendingDialogue.mia.slice(0, 10)}` : "",
    [pendingDialogue]
  );

  const hearts = useMemo(() => {
    if (!burstKey) return [];
    const mid = (alexPos + miaPos) / 2;
    return Array.from({ length: 6 }, (_, i) => ({
      id: `${burstKey}-${i}`,
      left: `${mid + (i - 2.5) * 2.4}%`,
      bottom: `${28 + (i % 3) * 5}%`,
      delay: `${i * 0.1}s`
    }));
  }, [burstKey, alexPos, miaPos]);

  useEffect(() => {
    if (!pendingDialogue) {
      setPhase("idle");
      return;
    }
    setPhase("alex");
  }, [pendingDialogue]);

  const onAlexDone = useCallback(() => setPhase("mia"), []);
  const onMiaDone = useCallback(() => {
    window.setTimeout(() => {
      onDialogueEnd();
      setPhase("idle");
    }, 6500);
  }, [onDialogueEnd]);

  return (
    <div className="farm pixel-scene" aria-label="像素农场">
      <div className="farm__sky" />
      <div className="farm__sun" />
      <div className="farm__cloud farm__cloud--1" />
      <div className="farm__cloud farm__cloud--2" />

      <div className="farm__barn pixel-border">
        <span className="farm__barn-door" />
        <span className="farm__label">谷仓</span>
      </div>

      <div className="farm__gh pixel-border">
        <div className="farm__gh-roof" />
        <span className="farm__label">温室</span>
      </div>

      <div className="farm__coop pixel-border">
        <span className="farm__label">家禽舍</span>
        <div className="farm__chickens">
          <span>🐔</span>
          <span>🐤</span>
          <span>🐔</span>
        </div>
      </div>

      <div className="farm__crops">
        {crops.map((c) => (
          <div key={c.id} className={cropClass(c.stage)} title="田地">
            {cropGlyph(c.stage)}
          </div>
        ))}
      </div>

      <div className="farm__chars">
        <div className="char char--alex" style={{ left: `${alexPos}%` }}>
          <div className="char__body" />
          <div className="char__bubble-slot">
            {pendingDialogue && (
              <SpeechBubble
                speaker="Alex"
                text={pendingDialogue.alex}
                active={phase === "alex"}
                onComplete={onAlexDone}
              />
            )}
          </div>
          <span className="char__name">Alex</span>
        </div>
        <div className="char char--mia" style={{ left: `${miaPos}%` }}>
          <div className="char__body char__body--mia" />
          <div className="char__bubble-slot">
            {pendingDialogue && (
              <SpeechBubble
                speaker="Mia"
                text={pendingDialogue.mia}
                active={phase === "mia"}
                onComplete={onMiaDone}
              />
            )}
          </div>
          <span className="char__name">Mia</span>
        </div>
      </div>

      <div className="farm__hearts" aria-hidden>
        {hearts.map((h) => (
          <span
            key={h.id}
            className="farm__heart"
            style={{ left: h.left, bottom: h.bottom, animationDelay: h.delay }}
          >
            ♥
          </span>
        ))}
      </div>
    </div>
  );
}
