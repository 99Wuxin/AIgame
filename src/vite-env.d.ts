/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 为 true 时请求同源 /api/chat-proxy（Pages Function），浏览器不携带 OpenRouter 密钥 */
  readonly VITE_USE_OPENROUTER_PROXY?: string;
}
