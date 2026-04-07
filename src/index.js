/**
 * https://statutebill.com/aigame/ → Hello world（纯文本）
 * 若仍 404 或 MIME 异常：检查 Worker 99 是否需 Service binding 转发 /aigame（见 Cloudflare 路由优先级）。
 */
export default {
  fetch() {
    return new Response("Hello world", {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-cache"
      }
    });
  }
};
