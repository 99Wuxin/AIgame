import type { LogEntry } from "../types";

type Props = {
  logs: LogEntry[];
};

export function RightPanel({ logs }: Props) {
  return (
    <aside className="panel panel--right pixel-border">
      <h2 className="panel__title">事件日志</h2>
      <ul className="log-list">
        {logs.map((e, i) => (
          <li key={`${e.time}-${i}`}>
            <span className="log-list__t">{e.time}</span>{" "}
            {e.strong ? <strong>{e.text}</strong> : e.text}
          </li>
        ))}
      </ul>
    </aside>
  );
}
