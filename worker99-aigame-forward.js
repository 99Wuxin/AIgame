/**
 * Worker「99」必须把 /aigame 整段交给 aigame，否则 /aigame/assets/*.js 会落到 99 的 SPA，
 * 返回 HTML → 控制台：Expected JavaScript but got MIME text/html。
 *
 * 1) 控制台：Worker「99」→ Bindings → Service binding：Name=AIGAME，Worker=aigame
 * 2) 下面代码必须跑在 99 里「任何」返回 HTML / 静态文件 / 回退逻辑之前。
 */

export async function forwardAigameIfNeeded(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/aigame" || url.pathname.startsWith("/aigame/")) {
    const target = env.AIGAME;
    if (!target || typeof target.fetch !== "function") {
      return new Response(
        "Worker 99: binding AIGAME missing. Add Service binding AIGAME → worker aigame.",
        { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } }
      );
    }
    return target.fetch(request);
  }
  return null;
}

/* ——— 若 99 是 module worker 默认导出，可整段用下面结构 ———
export default {
  async fetch(request, env, ctx) {
    const early = await forwardAigameIfNeeded(request, env);
    if (early) return early;
    return yourOriginalHandler(request, env, ctx);
  },
};
*/

/* ——— 若 99 用 Hono：第一个 app.use，且必须先于其它 use ———
import { forwardAigameIfNeeded } from "./forward-aigame.js"; // 或内联

app.use("*", async (c, next) => {
  const r = await forwardAigameIfNeeded(c.req.raw, c.env);
  if (r) return r;
  await next();
});
*/
