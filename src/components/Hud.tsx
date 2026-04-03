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
  onFast,
}: Props) {
  return (
    <footer className="hud">
      <div className="hud__time">
        <div className="clock-display">
          <span className="clock-date">{dateLabel}</span>
          <span className="clock-time">{timeLabel}</span>
        </div>
        <div className="time-controls">
          <button type="button" className="btn" onClick={onPauseToggle}>
            {paused ? "继续" : "暂停"}
          </button>
          <button type="button" className={`btn ${timeScale === 0.5 ? "btn--active" : ""}`} onClick={onSlow}>
            0.5×
          </button>
          <button type="button" className={`btn ${timeScale === 1 ? "btn--active" : ""}`} onClick={onNormal}>
            1×
          </button>
          <button type="button" className={`btn ${timeScale === 2 ? "btn--active" : ""}`} onClick={onFast}>
            2×
          </button>
        </div>
      </div>

      <div className="hud__needs">
        <div className="need-card" data-who="alex">
          <div className="need-card__head">
            <span className="avatar avatar--alex">A</span>
            <span>Alex</span>
          </div>
          <div className="meters">
            <Meter label="饥饿" value={alex.hunger} kind="hunger" id="alex" />
            <Meter label="社交" value={alex.social} kind="social" id="alex" />
            <Meter label="精力" value={alex.energy} kind="energy" id="alex" />
            <Meter label="爱意" value={alex.love} kind="love" id="alex" />
          </div>
        </div>
        <div className="need-card" data-who="mia">
          <div className="need-card__head">
            <span className="avatar avatar--mia">M</span>
            <span>Mia</span>
          </div>
          <div className="meters">
            <Meter label="饥饿" value={mia.hunger} kind="hunger" id="mia" />
            <Meter label="社交" value={mia.social} kind="social" id="mia" />
            <Meter label="精力" value={mia.energy} kind="energy" id="mia" />
            <Meter label="爱意" value={mia.love} kind="love" id="mia" />
          </div>
        </div>
      </div>
    </footer>
  );
}

function Meter({
  label,
  value,
  kind,
  id,
}: {
  label: string;
  value: number;
  kind: "hunger" | "social" | "energy" | "love";
  id: string;
}) {
  return (
    <div className="meter">
      <span>{label}</span>
      <div className="bar">
        <div
          className={`bar-fill bar-fill--${kind}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          id={`${id}-${kind}`}
        />
      </div>
    </div>
  );
}
