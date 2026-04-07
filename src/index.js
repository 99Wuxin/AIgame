import { DEFAULT_MODEL, openRouterChat } from "./openrouter.js";

function chatPageHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ChatBot · OpenRouter</title>
  <style>
    :root { color-scheme: dark; --bg: #0f1118; --panel: #1a1f2e; --border: #3d4659; --accent: #7c9cff; --text: #e8ecf4; --muted: #8b95a8; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; display: flex; flex-direction: column; }
    header { padding: 12px 16px; border-bottom: 1px solid var(--border); background: var(--panel); }
    h1 { margin: 0; font-size: 1rem; font-weight: 600; color: var(--accent); }
    #log { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; max-width: 720px; margin: 0 auto; width: 100%; }
    .msg { padding: 10px 14px; border-radius: 10px; max-width: 92%; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
    .msg.user { align-self: flex-end; background: #2a3145; border: 1px solid var(--border); }
    .msg.bot { align-self: flex-start; background: #1e2433; border: 1px solid var(--border); }
    .msg.err { border-color: #c45c5c; color: #ffb4b4; }
    .msg.thinking {
      align-self: flex-start;
      border-color: var(--accent);
      background: linear-gradient(105deg, #1e2433 0%, #232a3d 50%, #1e2433 100%);
      background-size: 200% 100%;
      animation: thinking-bg 2s ease-in-out infinite;
    }
    @keyframes thinking-bg {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    .thinking-dots { display: inline-flex; gap: 2px; margin-left: 2px; vertical-align: bottom; }
    .thinking-dots span {
      display: inline-block;
      width: 0.35em;
      text-align: center;
      animation: think-dot 1.2s ease-in-out infinite;
      opacity: 0.35;
    }
    .thinking-dots span:nth-child(2) { animation-delay: 0.15s; }
    .thinking-dots span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes think-dot {
      0%, 100% { opacity: 0.25; transform: translateY(0); }
      50% { opacity: 1; transform: translateY(-2px); }
    }
    .meta { font-size: 0.75rem; color: var(--muted); margin-top: 4px; }
    footer { padding: 12px 16px; border-top: 1px solid var(--border); background: var(--panel); }
    form { display: flex; gap: 8px; max-width: 720px; margin: 0 auto; width: 100%; }
    textarea { flex: 1; min-height: 44px; max-height: 160px; resize: vertical; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border); background: #0f1118; color: var(--text); font-size: 0.95rem; }
    button { padding: 10px 18px; border-radius: 8px; border: 1px solid var(--accent); background: var(--accent); color: #0f1118; font-weight: 600; cursor: pointer; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
  </style>
</head>
<body>
  <header><h1>ChatBot（OpenRouter · ${DEFAULT_MODEL}）</h1></header>
  <div id="log" aria-live="polite"></div>
  <footer>
    <form id="f">
      <textarea id="t" rows="2" placeholder="输入消息… Enter 发送，Shift+Enter 换行" autocomplete="off"></textarea>
      <button type="submit" id="send">发送</button>
    </form>
  </footer>
  <script>
(function () {
  var log = document.getElementById("log");
  var form = document.getElementById("f");
  var ta = document.getElementById("t");
  var btn = document.getElementById("send");
  var messages = [{ role: "system", content: "You are a helpful assistant. Reply in the same language as the user (e.g. Chinese when they write Chinese)." }];

  function apiChatUrl() {
    var p = location.pathname;
    if (!p.endsWith("/")) p += "/";
    return p + "api/chat";
  }

  function addMsg(role, text, extra) {
    var d = document.createElement("div");
    d.className = "msg " + (role === "user" ? "user" : "bot") + (extra === "err" ? " err" : "");
    d.textContent = text;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }

  function showThinking() {
    var d = document.createElement("div");
    d.className = "msg bot thinking";
    d.setAttribute("role", "status");
    d.setAttribute("aria-label", "助手正在思考");
    d.innerHTML = '<span class="thinking-inner">正在思考</span><span class="thinking-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>';
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var text = ta.value.trim();
    if (!text) return;
    ta.value = "";
    addMsg("user", text);
    messages.push({ role: "user", content: text });
    btn.disabled = true;
    var thinkingEl = showThinking();
    try {
      var res = await fetch(apiChatUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages })
      });
      var data = await res.json().catch(function () { return {}; });
      thinkingEl.remove();
      if (!res.ok) {
        var errLine = data.error || "请求失败 (" + res.status + ")";
        if (data.hint) errLine += "\\n\\n" + data.hint;
        if (data.details) errLine += "\\n\\n详情：\\n" + data.details;
        addMsg("bot", errLine, "err");
        messages.pop();
        return;
      }
      var reply = data.reply || "";
      addMsg("bot", reply);
      messages.push({ role: "assistant", content: reply });
    } catch (err) {
      thinkingEl.remove();
      addMsg("bot", String(err.message || err), "err");
      messages.pop();
    } finally {
      btn.disabled = false;
      ta.focus();
    }
  });

  ta.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    }
  });
})();
  </script>
</body>
</html>`;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/aigame" && request.method === "GET") {
      return Response.redirect(new URL("/aigame/", url).toString(), 302);
    }

    if (path === "/" && request.method === "GET") {
      return Response.redirect(new URL("/aigame/", url).toString(), 302);
    }

    if (path === "/aigame/api/chat" && request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (path === "/aigame/api/chat" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders() });
      }

      const messages = body.messages;
      if (!Array.isArray(messages) || messages.length === 0) {
        return Response.json({ error: "messages 必须为非空数组" }, { status: 400, headers: corsHeaders() });
      }

      const result = await openRouterChat(env, {
        messages,
        max_tokens: body.max_tokens,
        temperature: body.temperature
      });

      if (!result.ok) {
        return Response.json(
          {
            error: result.error,
            details: result.details,
            hint: "常见原因：① Key 无效/欠费 ② 该免费模型限流或上游异常。当前仅使用 stepfun/step-3.5-flash:free。"
          },
          { status: result.status >= 400 ? result.status : 502, headers: corsHeaders() }
        );
      }

      return Response.json(
        { reply: result.text, model: result.model },
        { headers: { "content-type": "application/json; charset=utf-8", ...corsHeaders() } }
      );
    }

    if (path === "/aigame" || path === "/aigame/") {
      return new Response(chatPageHtml(), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-cache"
        }
      });
    }

    return new Response("Not found", { status: 404 });
  }
};
