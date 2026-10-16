import { createMiddleware } from "hono/factory";
import { webOrigin } from "../config/config.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF 対策。状態を変えるリクエスト（POST / PUT / DELETE など）は、
 * 画面（WEB_ORIGIN）から送られた JSON だけを受け付ける。
 */
export const originCheckMiddleware = createMiddleware(async (c, next) => {
  if (SAFE_METHODS.has(c.req.method)) {
    return next();
  }

  if (c.req.header("origin") !== webOrigin) {
    return c.json({ message: "不正なリクエストです" }, 403);
  }

  // text/plain のフォーム送信で JSON を送り込まれないよう、Content-Type も確認する
  const contentType = c.req.header("content-type") ?? "";
  const hasBody = Number(c.req.header("content-length") ?? 0) > 0 || c.req.header("transfer-encoding") !== undefined;
  if (hasBody && !contentType.startsWith("application/json")) {
    return c.json({ message: "Content-Type は application/json にしてください" }, 415);
  }

  await next();
});
