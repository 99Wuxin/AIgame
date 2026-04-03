import type { Needs } from "../types";
import type { ThoughtLine } from "../lib/thoughts";

export type HudTab = "status" | "daily";

type Props = {
  dateLabel: string;
  timeLabel: string;
  paused: boolean;
  timeScale: number;
  alex: Needs;
  mia: Needs;
  hudTab: HudTab;
  onHudTab: (t: HudTab) => void;
  dailyThoughts: ThoughtLine[];
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
  hudTab,
  onHudTab,
  dailyThoughts,
  onPauseToggle,
  onSlow,
  onNormal,
  onFast,
}: Props) {
  return (
    <footer className="hud">
      <div className="hud__tabs" role="tablist" aria-label="底部面板">
        <button
          type="button"
          role="tab"
          aria-selected={hudTab === "status"}
          className={`hud-tab ${hudTab === "status" ? "hud-tab--active" : ""}`}
          onClick={() => onHudTab("status")}
        >
          状态
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={hudTab === "daily"}
          className={`hud-tab ${hudTab === "daily" ? "hud-tab--active" : ""}`}
          onClick={() => onHudTab("daily")}
        >
          Daily Log
        </button>
      </div>

      {hudTab === "status" ? (
        <div className="hud__status-row">
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
        </div>
      ) : (
        <div className="hud__daily" role="tabpanel">
          <p className="daily-log__hint">实时思维流 · 中英 · 随自治决策更新</p>
          <ul className="daily-log">
            {dailyThoughts.length === 0 ? (
              <li className="daily-log__empty">暂无记录，稍候将写入第一条思维……</li>
            ) : (
              dailyThoughts.map((e, i) => (
                <li key={`${e.time}-${e.agent}-${i}`} className="daily-log__row">
                  <span className="daily-log__time">{e.time}</span>
                  <span className={`daily-log__agent daily-log__agent--${e.agent}`}>{labelAgent(e.agent)}</span>
                  <span className="daily-log__zh">{e.zh}</span>
                  <span className="daily-log__en">{e.en}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </footer>
  );
}

function labelAgent(a: ThoughtLine["agent"]): string {
  if (a === "alex") return "Alex";
  if (a === "mia") return "Mia";
  if (a === "liu") return "刘";
  return "佳";
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
