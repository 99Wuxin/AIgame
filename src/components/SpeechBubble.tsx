import { useEffect, useRef, useState } from "react";

type Props = {
  speaker: string;
  text: string;
  active: boolean;
  onComplete?: () => void;
};

export function SpeechBubble({ speaker, text, active, onComplete }: Props) {
  const [display, setDisplay] = useState("");
  const doneRef = useRef(onComplete);
  doneRef.current = onComplete;

  useEffect(() => {
    if (!active || !text) {
      setDisplay("");
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setDisplay(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(id);
        doneRef.current?.();
      }
    }, 16 + Math.random() * 10);
    return () => window.clearInterval(id);
  }, [active, text]);

  if (!active) return null;

  return (
    <div className="speech-bubble">
      <span className="speaker">{speaker}</span>
      {display}
    </div>
  );
}
