# 田园心语（AIgame）

基于 **React**、**TypeScript** 与 **Vite** 的农场生活模拟网页游戏：Alex 与 Mia 的对话可由 [OpenRouter](https://openrouter.ai/) 上的 **`qwen/qwen3.6-plus:free`** 生成；未配置 API 时使用本地模拟台词。

## 对话 API（OpenRouter）

- **Base URL**：`https://openrouter.ai/api/v1`
- **模型**：`qwen/qwen3.6-plus:free`
- **流程**：首轮请求带 `reasoning: { enabled: true }`，将返回的 `assistant` 消息（含 `reasoning_details`）原样放入第二轮 `messages`，再请求一次以得到最终 JSON 台词。

### 方式 A：浏览器直连（本地开发）

在页面左侧填写 `sk-or-...` 密钥并保存（仅存浏览器 `localStorage`）。

### 方式 B：Cloudflare Pages + Functions（密钥不暴露给前端）

1. 仓库根目录已有 `functions/api/chat-proxy.ts`：将请求转发到 OpenRouter，并注入服务端密钥。
2. 构建时启用代理：项目根目录 `.env.production` 含 `VITE_USE_OPENROUTER_PROXY=true`（生产构建会打包进前端）。
3. 在 **Cloudflare Pages** 控制台 → **Settings** → **Variables and Secrets**：
   - **Secret**：`OPENROUTER_API_KEY` = 你的 `sk-or-...`
   - 若需覆盖构建变量，可在 **Production** 环境变量里再设一次 `VITE_USE_OPENROUTER_PROXY=true`（与本地 `.env.production` 一致即可）。
4. 部署后前端请求同源 **`/api/chat-proxy`**，不再在浏览器里保存 OpenRouter 密钥。若要在页面上改回「浏览器直连」，在左侧 **API Base URL** 填入 `https://openrouter.ai/api/v1` 并保存即可覆盖代理。

本地用 Vite 模拟代理时：复制 `.env.example` 为 `.env.local`，设置 `VITE_USE_OPENROUTER_PROXY=true` 与 `OPENROUTER_API_KEY`，再 `npm run dev`。

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
npm run preview
```

`npm run preview` 为纯静态预览，**不会**带上 Cloudflare Functions；要连真实代理可执行 `npx wrangler pages dev ./dist`（需先 `npm run build`，并在 Cloudflare 环境或 `.dev.vars` 中提供 `OPENROUTER_API_KEY`）。

## 部署到 GitHub Pages（可选）

构建产物在 `dist/`。将 `vite.config.ts` 中的 `base` 设为仓库名路径（例如 `/AIgame/`）后重新构建，再把 `dist` 内容推到 `gh-pages` 分支或使用 Actions 发布。GitHub Pages **没有** Cloudflare Functions，若要用服务端代理请使用 **Cloudflare Pages**。

## 仓库

<https://github.com/99Wuxin/AIgame>
