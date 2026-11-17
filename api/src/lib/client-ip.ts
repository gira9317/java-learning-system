import type { Context } from "hono";
import { getConnInfo } from "@hono/node-server/conninfo";
import { trustProxy } from "../config/config.js";

/**
 * 試行回数の制限に使う接続元 IP。
 * ブラウザからのリクエストは web（Next.js）を経由して届くため、そのままでは全員が web サーバーの IP に見える。
 * TRUST_PROXY=true のときは X-Forwarded-For の一番右（API に一番近いプロキシが見た相手）を使う。
 */
export function getClientIp(c: Context): string {
  if (trustProxy) {
    const forwarded = c.req.header("x-forwarded-for");
    const last = forwarded?.split(",").at(-1)?.trim();
    if (last) return last;
  }
  return getConnInfo(c).remote.address ?? "unknown";
}
