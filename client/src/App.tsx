import { FarmScene } from "./components/FarmScene";
import { Hud } from "./components/Hud";
import { RightPanel } from "./components/RightPanel";
import { LeftPanel } from "./components/SidePanels";
import { useFarmGame } from "./hooks/useFarmGame";
import "./theme.css";

const SEASONS = ["春", "夏", "秋", "冬"];

function pad2(n: number) {
  return String(Math.floor(n)).padStart(2, "0");
}

export default function App() {
  const { snap, clearPendingDialogue, setPaused, setTimeScale } = useFarmGame();
  const h = Math.floor(snap.minuteOfGame / 60) % 24;
  const m = Math.floor(snap.minuteOfGame % 60);
  const season = SEASONS[snap.seasonIndex % 4]!;

  return (
    <div className="app">
      <header className="top-bar pixel-border">
        <h1 className="top-bar__logo">田园心语</h1>
        <p className="top-bar__tag">像素 AI 农场 · 模拟人生式需求 · LLM 自主恋爱对话</p>
      </header>

      <main className="layout">
        <LeftPanel bond={snap.bond} />
        <section className="stage-wrap pixel-border">
          <FarmScene
            crops={snap.crops}
            alexPos={snap.alexPos}
            miaPos={snap.miaPos}
            pendingDialogue={snap.pendingDialogue}
            onDialogueEnd={clearPendingDialogue}
          />
        </section>
        <RightPanel logs={snap.logs} />
      </main>

      <Hud
        dateLabel={`第 ${snap.day} 天 · ${season}`}
        timeLabel={`${pad2(h)}:${pad2(m)}`}
        paused={snap.paused}
        timeScale={snap.timeScale}
        alex={snap.alex}
        mia={snap.mia}
        onPauseToggle={() => setPaused(!snap.paused)}
        onSlow={() => setTimeScale(0.5)}
        onNormal={() => setTimeScale(1)}
        onFast={() => setTimeScale(2)}
      />
    </div>
  );
}
