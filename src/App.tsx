import "./theme.css";
import { FarmScene } from "./components/FarmScene";
import { Hud } from "./components/Hud";
import { LeftPanel, LogPanel } from "./components/SidePanels";
import { useFarmGame } from "./hooks/useFarmGame";

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
      <header className="top-bar">
        <h1 className="logo">田园心语</h1>
        <p className="tagline">AI 自主对话 · 农场生活模拟 · React + TypeScript</p>
      </header>

      <main className="layout">
        <LeftPanel bond={snap.bond} />

        <section className="stage-wrap">
          <FarmScene
            crops={snap.crops}
            alexPos={snap.alexPos}
            miaPos={snap.miaPos}
            pendingDialogue={snap.pendingDialogue}
            onDialogueEnd={clearPendingDialogue}
          />
        </section>

        <LogPanel logs={snap.logs} />
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
