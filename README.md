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

### Cloudflare Pages 控制台（避免 `wrangler deploy` 报错）

日志里若出现 `Missing entry-point to Worker script` 或提示应使用 `wrangler pages deploy`，说明 **Deploy command 配错了**。

在 Pages 项目 → **Settings** → **Builds** 中建议如下：

| 项 | 值 |
| --- | --- |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |

- **不要**填写 **`npx wrangler deploy`**。那是 [Workers](https://developers.cloudflare.com/workers/wrangler/commands/#deploy) 的部署命令；本仓库是 **Pages**（静态 `dist` + 根目录 `functions/`），构建完成后由 Pages **自动发布**，无需单独 deploy 命令。
- 若存在 **Deploy command**、**Custom deploy** 等额外步骤，请 **留空** 或删除，只保留上面的 build + output。
- **若控制台不允许留空 Deploy command**（保存后仍强制执行 `wrangler deploy`）：把 Deploy command 改成 **`npm run deploy`**。本仓库的 `deploy` 脚本为空操作（直接退出 0），不会调用 Wrangler；Pages 仍会在构建完成后照常发布 `dist` 与 `functions/`。
- 根目录 `functions/` 会随 Pages 一起部署，无需 `wrangler deploy`。

本机用 CLI 手动上传到 Pages 时，应使用：

```bash
npm run build
npx wrangler pages deploy dist --project-name=<你的 Pages 项目名>
```

（与 `wrangler deploy` 不同。）

### 线上只看到「Hello world」、没有田园心语界面

页面上只有 **`Hello world` 纯文字** 时，**不是**本仓库构建出来的页面（本应用标题为「田园心语」）。常见原因：

1. **域名 `statutebill.com` 上绑了别的 [Worker](https://developers.cloudflare.com/workers/)**，默认脚本返回 `Hello world`，且路由优先级高于 Pages。
2. **Workers 路由** 把 `/aigame` 指到了该 Worker，而不是你的 Pages 项目。

请在本仓库 **Cloudflare** 里检查：

- **Workers & Pages** → 是否有名为 `hello-world` / 默认模板的 Worker 绑在 `statutebill.com` 或 `*/aigame`；
- **域名** → **Workers 路由** / **Triggers** 里是否把路径指错；
- 需要让 **`/aigame`**（或整站）指向 **Pages 部署** 的源，或先 **禁用/删除** 冲突的 Worker 路由。

若站点挂在 **子路径** `https://statutebill.com/aigame/`：在 Pages 的 **Environment variables**（Production）里增加 **`VITE_BASE_PATH=/aigame/`**，重新执行 **`npm run build`** 部署，否则 JS/CSS 可能 404（页面空白或异常）。

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
