import { useCallback, useEffect, useState } from "react";
import type { LogEntry } from "../types";
import { DEFAULT_MODEL, STORAGE_BASE, STORAGE_KEY, STORAGE_MODEL } from "../lib/openrouter";

type LeftProps = { bond: number };

export function LeftPanel({ bond }: LeftProps) {
  const [apiKey, setApiKey] = useState("");
  const [apiBase, setApiBase] = useState("https://openrouter.ai/api/v1");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [status, setStatus] = useState("当前：本地模拟 AI");

  useEffect(() => {
    setApiKey(localStorage.getItem(STORAGE_KEY) ?? "");
    setApiBase(localStorage.getItem(STORAGE_BASE) ?? "https://openrouter.ai/api/v1");
    setModel(localStorage.getItem(STORAGE_MODEL) ?? DEFAULT_MODEL);
    setStatus(localStorage.getItem(STORAGE_KEY) ? "当前：已保存密钥，将使用 OpenRouter" : "当前：本地模拟 AI");
  }, []);

  const save = useCallback(() => {
    const k = apiKey.trim();
    const b = apiBase.trim() || "https://openrouter.ai/api/v1";
    const m = model.trim() || DEFAULT_MODEL;
    if (k) {
      localStorage.setItem(STORAGE_KEY, k);
      localStorage.setItem(STORAGE_BASE, b);
      localStorage.setItem(STORAGE_MODEL, m);
      setStatus("当前：已保存密钥，将使用 OpenRouter");
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_BASE);
      localStorage.removeItem(STORAGE_MODEL);
      setStatus("当前：本地模拟 AI");
    }
  }, [apiKey, apiBase, model]);

  return (
    <aside className="panel panel--left">
      <h2>关系</h2>
      <div className="relationship-list">
        <div className="rel-item">
          <div className="rel-item__pair">Alex · Mia</div>
          <div className="rel-item__bar">
            <div className="rel-item__fill" style={{ width: `${bond}%` }} />
          </div>
          <div style={{ marginTop: 6, fontSize: "0.72rem", color: "var(--muted)" }}>亲密度 {Math.round(bond)} / 100</div>
        </div>
      </div>
      <div className="llm-hint">
        <label className="llm-label">OpenRouter API</label>
        <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-or-… 仅存本机" autoComplete="off" />
        <input type="text" value={apiBase} onChange={(e) => setApiBase(e.target.value)} placeholder="API Base URL" />
        <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="模型 ID" />
        <button type="button" className="btn btn--small" onClick={save}>
          保存并启用真实 LLM
        </button>
        <p className="llm-status">{status}</p>
        <p className="llm-status" style={{ marginTop: 4 }}>
          默认 qwen/qwen3.6-plus:free：首轮 <code>reasoning</code>，次轮原样传回 <code>reasoning_details</code>。
        </p>
      </div>
    </aside>
  );
}

type LogProps = { logs: LogEntry[] };

export function LogPanel({ logs }: LogProps) {
  return (
    <aside className="panel panel--right">
      <h2>日志</h2>
      <ul className="log-list">
        {logs.map((log, i) => (
          <li key={`${log.time}-${i}-${log.text.slice(0, 8)}`}>
            {log.strong ? (
              <>
                <strong>[{log.time}]</strong> {log.text}
              </>
            ) : (
              <>
                [{log.time}] {log.text}
              </>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
