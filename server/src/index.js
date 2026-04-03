import { Hono } from "hono";
import { cors } from "hono/cors";
import { isOpenRouterConfigured, openRouterChatCompletion, openRouterModel } from "./openRouter.js";
import { parseFarmDialogueJson } from "./farmDialogue.js";

const app = new Hono();

app.use(
  "/api/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"]
  })
);

app.get("/api/health", (c) => c.json({ ok: true, service: "pixel-farm-ai" }));

/**
 * Body: { day, season, hour, bond, moodA, moodM, alexNeeds, miaNeeds, cropSummary }
 * Returns: { alex, mia, meta: { source: "llm"|"local", error? } }
 */
app.post("/api/farm/chat", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const ctx = {
      day: Number(body.day) || 1,
      season: String(body.season || "春"),
      hour: Number(body.hour) || 12,
      bond: Number(body.bond) || 0,
      moodA: Number(body.moodA) || 50,
      moodM: Number(body.moodM) || 50,
      alexHunger: Number(body.alexHunger) ?? 70,
      miaHunger: Number(body.miaHunger) ?? 70
    };

    if (!isOpenRouterConfigured(c.env)) {
      return c.json({
        alex: "（本地）今天田里风很柔……我在想，和你一起把这块地种好，就够了。",
        mia: "（本地）嗯，我也在算灌溉时间。你一说，我心里就稳了一点。",
        meta: { source: "local", error: "OPENROUTER_API_KEY not set" }
      });
    }

    const system = `你是像素风生活模拟游戏「田园心语」的双角色编剧。只输出 JSON，不要 markdown 代码块。
角色：Alex（温和、略内向、体贴、会规划农活）、Mia（敏锐、温柔、会接话、关心作物与家禽）。
场景：两人同在农场，有谷仓、温室、家禽舍与多块田地；恋人未满的暧昧与默契。
输出格式严格为：{"alex":"一句中文台词","mia":"一句回应中文台词"}
要求：每句 18-55 字；有情感或农场细节推进；口语自然。`;

    const userPayload = JSON.stringify({
      第几天: ctx.day,
      季节: ctx.season,
      时刻: `${ctx.hour}:00`,
      亲密度0到100: Math.round(ctx.bond),
      Alex心情0到100: Math.round(ctx.moodA),
      Mia心情0到100: Math.round(ctx.moodM),
      Alex饥饿感0到100: Math.round(ctx.alexHunger),
      Mia饥饿感0到100: Math.round(ctx.miaHunger)
    });

    const model = openRouterModel(c.env);
    const first = await openRouterChatCompletion(c.env, {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPayload }
      ],
      temperature: 0.88,
      max_tokens: 400
    });

    let text = first.text;
    if (!first.ok || !text) {
      return c.json({
        alex: "（回退）刚才网络有点卡……你刚才说什么？",
        mia: "（回退）我在听呢，我们从头慢慢说。",
        meta: { source: "local", error: first.raw?.error?.message || `http ${first.status}` }
      });
    }

    let parsed = parseFarmDialogueJson(text);
    if (!parsed) {
      const second = await openRouterChatCompletion(c.env, {
        model,
        messages: [
          { role: "system", content: system + "\n上次输出无效，请只输出合法 JSON 一行。" },
          { role: "user", content: userPayload }
        ],
        temperature: 0.6,
        max_tokens: 350
      });
      text = second.text;
      parsed = parseFarmDialogueJson(text);
    }

    if (!parsed) {
      return c.json({
        alex: "（回退）星星快出来了，要不要去温室看看？",
        mia: "（回退）好啊，我正好想和你并肩走一段路。",
        meta: { source: "local", error: "invalid_json" }
      });
    }

    return c.json({
      alex: parsed.alex,
      mia: parsed.mia,
      meta: { source: "llm", model }
    });
  } catch (e) {
    console.error(e);
    return c.json(
      {
        alex: "（回退）我有点走神了……",
        mia: "（回退）没关系，我在这儿。",
        meta: { source: "local", error: String(e?.message || e) }
      },
      200
    );
  }
});

app.get("/", async (c) => {
  if (c.env?.ASSETS) return c.env.ASSETS.fetch(c.req.raw);
  return c.text("Build client: npm run build -w client", 503);
});

app.get("*", async (c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: "Not found" }, 404);
  }
  if (c.env?.ASSETS) return c.env.ASSETS.fetch(c.req.raw);
  return c.text("Not found", 404);
});

export default app;
