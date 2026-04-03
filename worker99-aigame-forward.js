/**
 * Worker「99」与「aigame」同域共存时，根路由 statutebill.com/* 往往会先处理
 * /aigame/assets/*.js，把 SPA 的 index.html 当成 JS 返回 → 浏览器白屏（只有标题）。
 *
 * 用法：
 * 1. Cloudflare → Worker「99」→ Settings → Bindings → Add binding → Worker
 *    名称：AIGAME，选 Worker：aigame
 * 2. 在 99 的 fetch 最前面调用下面逻辑（或整段复制进入口）。
 */
export async function forwardAigameIfNeeded(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/aigame" || url.pathname.startsWith("/aigame/")) {
    const target = env.AIGAME;
    if (!target || typeof target.fetch !== "function") {
      return new Response(
        "Binding AIGAME missing: add Worker binding AIGAME → aigame on Worker 99",
        { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } }
      );
    }
    return target.fetch(request);
  }
  return null;
}
