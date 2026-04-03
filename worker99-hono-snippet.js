/**
 * Worker「99」Hono：复制到 `const app = new Hono()` 之后、其它 app.use 之前。
 *
 * 常见错误：
 * 1) 写了 env.AIGAME.fetch() 但忘记 return → 继续 next() → 主站无 /aigame → 404
 * 2) 这段放在「会 return 的中间件」后面 → 永远轮不到转发
 */

app.use("*", async (c, next) => {
  const url = new URL(c.req.url);
  if (url.pathname === "/aigame" || url.pathname.startsWith("/aigame/")) {
    const w = c.env.AIGAME;
    if (!w || typeof w.fetch !== "function") {
      return c.text(
        "Worker99: c.env.AIGAME 未定义。Dashboard 添加 Service binding AIGAME→aigame，或 wrangler 写 [[services]] 后重新部署 99。",
        500
      );
    }
    return w.fetch(c.req.raw);
  }
  await next();
});
