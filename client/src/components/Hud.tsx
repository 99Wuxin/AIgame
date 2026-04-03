import type { Needs } from "../types";

type Props = {
  dateLabel: string;
  timeLabel: string;
  paused: boolean;
  timeScale: number;
  alex: Needs;
  mia: Needs;
  onPauseToggle: () => void;
  onSlow: () => void;
  onNormal: () => void;
  onFast: () => void;
};

export function Hud({
  dateLabel,
  timeLabel,
  paused,
  timeScale,
  alex,
  mia,
  onPauseToggle,
  onSlow,
  onNormal,
  onFast
}: Props) {
  return (
    <footer className="hud pixel-border">
      <div className="hud__time">
        <div className="hud__clock">
          <span className="hud__date">{dateLabel}</span>
          <span className="hud__clock-num">{timeLabel}</span>
        </div>
        <div className="hud__btns">
          <button type="button" className="pixel-btn" onClick={onPauseToggle}>
            {paused ? "继续" : "暂停"}
          </button>
          <button
            type="button"
            className={`pixel-btn ${timeScale === 0.5 ? "pixel-btn--on" : ""}`}
            onClick={onSlow}
          >
            0.5×
          </button>
          <button
            type="button"
            className={`pixel-btn ${timeScale === 1 ? "pixel-btn--on" : ""}`}
            onClick={onNormal}
          >
            1×
          </button>
          <button
            type="button"
            className={`pixel-btn ${timeScale === 2 ? "pixel-btn--on" : ""}`}
            onClick={onFast}
          >
            2×
          </button>
        </div>
      </div>

      <div className="hud__needs">
        <NeedCard who="Alex" color="alex" n={alex} />
        <NeedCard who="Mia" color="mia" n={mia} />
      </div>
    </footer>
  );
}

function NeedCard({
  who,
  color,
  n
}: {
  who: string;
  color: "alex" | "mia";
  n: Needs;
}) {
  return (
    <div className={`need-card need-card--${color} pixel-border`}>
      <div className="need-card__head">{who}</div>
      <Meter label="饥饿" v={n.hunger} kind="hunger" id={who} />
      <Meter label="社交" v={n.social} kind="social" id={who} />
      <Meter label="精力" v={n.energy} kind="energy" id={who} />
      <Meter label="爱意" v={n.love} kind="love" id={who} />
    </div>
  );
}

function Meter({
  label,
  v,
  kind,
  id
}: {
  label: string;
  v: number;
  kind: string;
  id: string;
}) {
  const w = Math.max(0, Math.min(100, v));
  return (
    <div className="meter">
      <span>{label}</span>
      <div className="meter__bar pixel-inset">
        <div className={`meter__fill meter__fill--${kind}`} style={{ width: `${w}%` }} id={`${id}-${kind}`} />
      </div>
    </div>
  );
}
