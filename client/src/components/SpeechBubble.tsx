import { useEffect, useState } from "react";

type Props = {
  speaker: string;
  text: string;
  active: boolean;
  onComplete: () => void;
};

export function SpeechBubble({ speaker, text, active, onComplete }: Props) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!active) {
      setShown(0);
      return;
    }
    setShown(0);
    let i = 0;
    const step = Math.max(1, Math.floor(text.length / 120));
    const id = window.setInterval(() => {
      i += step;
      if (i >= text.length) {
        setShown(text.length);
        window.clearInterval(id);
        window.setTimeout(onComplete, 900);
      } else {
        setShown(i);
      }
    }, 38);
    return () => window.clearInterval(id);
  }, [active, text, onComplete]);

  if (!active) return null;

  return (
    <div className="bubble pixel-border" role="dialog" aria-label={`${speaker} 的对话`}>
      <div className="bubble__speaker">{speaker}</div>
      <p className="bubble__text">{text.slice(0, shown)}</p>
    </div>
  );
}
