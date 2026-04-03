import { useState } from "react";
import "./theme.css";
import { FarmScene } from "./components/FarmScene";
import { type HudTab, Hud } from "./components/Hud";
import { RightPanel } from "./components/RightPanel";
import { LeftPanel } from "./components/SidePanels";
import { useFarmGame } from "./hooks/useFarmGame";
import { describeAlexPersonality, describeMiaPersonality } from "./lib/personality";

const SEASONS = ["春", "夏", "秋", "冬"];

function pad2(n: number) {
  return String(Math.floor(n)).padStart(2, "0");
}

export default function App() {
  const { snap, clearPendingDialogue, setPaused, setTimeScale, remainingInterventionSec, chooseIntervention } =
    useFarmGame();
  const [hudTab, setHudTab] = useState<HudTab>("status");

  const alexPersonality = describeAlexPersonality(snap.alexPersonality);
  const miaPersonality = describeMiaPersonality(snap.miaPersonality);

  const h = Math.floor(snap.minuteOfGame / 60) % 24;
  const m = Math.floor(snap.minuteOfGame % 60);
  const season = SEASONS[snap.seasonIndex % 4]!;

  return (
    <div className="app">
      <header className="top-bar">
        <h1 className="logo">田园心语</h1>
        <p className="tagline">AI 自主对话 · 玩家介入 · 农场生活模拟</p>
      </header>

      <main className="layout">
        <LeftPanel
          bond={snap.bond}
          alexPersonalityZh={alexPersonality.lineZh}
          alexPersonalityEn={alexPersonality.lineEn}
          miaPersonalityZh={miaPersonality.lineZh}
          miaPersonalityEn={miaPersonality.lineEn}
        />

        <section className="stage-wrap">
          <FarmScene
            crops={snap.crops}
            alexPos={snap.alexPos}
            miaPos={snap.miaPos}
            liu={snap.liu}
            jia={snap.jia}
            socialCaption={
              snap.liu.visible
                ? "Alex 与刘核对记录、商议肥料；Mia 在远处观望。"
                : undefined
            }
            pendingDialogue={snap.pendingDialogue}
            onDialogueEnd={clearPendingDialogue}
          />
        </section>

        <RightPanel
          logs={snap.logs}
          systemLog={snap.systemLog}
          intervention={snap.intervention}
          interventionLoading={snap.interventionLoading}
          remainingSec={remainingInterventionSec}
          alexTraits={snap.alexTraits}
          soilGreenhouse={snap.soilGreenhouse}
          cropPolicy={snap.cropPolicy}
          onChooseOption={chooseIntervention}
        />
      </main>

      <Hud
        dateLabel={`第 ${snap.day} 天 · ${season}`}
        timeLabel={`${pad2(h)}:${pad2(m)}`}
        paused={snap.paused}
        timeScale={snap.timeScale}
        alex={snap.alex}
        mia={snap.mia}
        hudTab={hudTab}
        onHudTab={setHudTab}
        dailyThoughts={snap.dailyThoughts}
        onPauseToggle={() => setPaused(!snap.paused)}
        onSlow={() => setTimeScale(0.5)}
        onNormal={() => setTimeScale(1)}
        onFast={() => setTimeScale(2)}
      />
    </div>
  );
}
