import { useCallback, useEffect, useState } from "react";
import { DEFAULT_MODEL, isOpenRouterProxyBuild, STORAGE_BASE, STORAGE_KEY, STORAGE_MODEL } from "../lib/openrouter";

type LeftProps = { bond: number };

function readLs(key: string) {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(key) ?? "";
}

export function LeftPanel({ bond }: LeftProps) {
  const [apiKey, setApiKey] = useState(() => readLs(STORAGE_KEY));
  const [apiBase, setApiBase] = useState(() => readLs(STORAGE_BASE));
  const [model, setModel] = useState(() => readLs(STORAGE_MODEL) || DEFAULT_MODEL);
  const [status, setStatus] = useState("当前：本地模拟 AI");

  const proxyBuild = isOpenRouterProxyBuild();
  const usingServerProxy = proxyBuild && !apiBase.trim();

  useEffect(() => {
    const k = readLs(STORAGE_KEY);
    const b = readLs(STORAGE_BASE);
    if (proxyBuild && !b) {
      setStatus("当前：使用 Cloudflare 服务端代理（OPENROUTER_API_KEY）");
    } else if (k) {
      setStatus("当前：已保存密钥，将使用 OpenRouter");
    } else {
      setStatus("当前：本地模拟 AI");
    }
  }, [proxyBuild]);

  const save = useCallback(() => {
    const k = apiKey.trim();
    const m = model.trim() || DEFAULT_MODEL;
    localStorage.setItem(STORAGE_MODEL, m);

    if (proxyBuild) {
      if (apiBase.trim()) {
        localStorage.setItem(STORAGE_BASE, apiBase.trim());
        if (k) localStorage.setItem(STORAGE_KEY, k);
        else localStorage.removeItem(STORAGE_KEY);
        setStatus(k ? "当前：浏览器直连 OpenRouter（已覆盖代理）" : "当前：仅自定义 Base URL（未填密钥则可能失败）");
      } else {
        localStorage.removeItem(STORAGE_BASE);
        localStorage.removeItem(STORAGE_KEY);
        setStatus("当前：使用 Cloudflare 服务端代理（OPENROUTER_API_KEY）");
      }
      return;
    }

    const b = apiBase.trim() || "https://openrouter.ai/api/v1";
    if (k) {
      localStorage.setItem(STORAGE_KEY, k);
      localStorage.setItem(STORAGE_BASE, b);
      setStatus("当前：已保存密钥，将使用 OpenRouter");
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_BASE);
      setStatus("当前：本地模拟 AI");
    }
  }, [apiKey, apiBase, model, proxyBuild]);

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
        {usingServerProxy ? (
          <p className="llm-status" style={{ marginBottom: 8 }}>
            已启用服务端代理：密钥在 Cloudflare Pages → Variables and Secrets 中配置 <strong>OPENROUTER_API_KEY</strong>，浏览器不保存密钥。
          </p>
        ) : null}
        {!usingServerProxy && (
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-or-… 仅存本机" autoComplete="off" />
        )}
        <input
          type="text"
          value={apiBase}
          onChange={(e) => setApiBase(e.target.value)}
          placeholder={proxyBuild ? "留空=服务端代理；填 URL=浏览器直连" : "API Base URL"}
        />
        <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="模型 ID" />
        <button type="button" className="btn btn--small" onClick={save}>
          保存设置
        </button>
        <p className="llm-status">{status}</p>
        <p className="llm-status" style={{ marginTop: 4 }}>
          默认 qwen/qwen3.6-plus:free：首轮 reasoning，次轮带回 reasoning_details。
        </p>
      </div>
    </aside>
  );
}

