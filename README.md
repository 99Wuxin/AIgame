# 田园心语（AIgame）

基于 **React**、**TypeScript** 与 **Vite** 的农场生活模拟网页游戏：Alex 与 Mia 的对话可由 [OpenRouter](https://openrouter.ai/) 上的 **`qwen/qwen3.6-plus:free`** 生成；未配置 API 时使用本地模拟台词。

## 对话 API（OpenRouter）

- **Base URL**：`https://openrouter.ai/api/v1`
- **模型**：`qwen/qwen3.6-plus:free`
- **流程**：首轮请求带 `reasoning: { enabled: true }`，将返回的 `assistant` 消息（含 `reasoning_details`）原样放入第二轮 `messages`，再请求一次以得到最终 JSON 台词。

在页面左侧填写 `sk-or-...` 密钥并保存（仅存浏览器 `localStorage`）。

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

## 部署到 GitHub Pages（可选）

构建产物在 `dist/`。将 `vite.config.ts` 中的 `base` 设为仓库名路径（例如 `/AIgame/`）后重新构建，再把 `dist` 内容推到 `gh-pages` 分支或使用 Actions 发布。

## 仓库

<https://github.com/99Wuxin/AIgame>
