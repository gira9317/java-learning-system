import { createHash, randomBytes } from "node:crypto";
import type { Context } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { isProduction, SESSION_DAYS_REMEMBER, SESSION_HOURS_DEFAULT } from "../config/config.js";
import { pool } from "../db.js";

export const SESSION_COOKIE = "session";

/** トークンは DB に保存せず、ハッシュだけを保存する（DB が漏れてもなりすませない） */
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** セッションを作り、クッキーにトークンを載せる */
export async function createSession(c: Context, userId: string, rememberMe: boolean) {
  const token = randomBytes(32).toString("base64url");
  const ms = rememberMe ? SESSION_DAYS_REMEMBER * 24 * 60 * 60 * 1000 : SESSION_HOURS_DEFAULT * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ms);

  await pool.query(
    `
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES ($1, $2, $3)
    `,
    [hashToken(token), userId, expiresAt],
  );

  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true, // JavaScript から読めない
    sameSite: "Lax", // 別サイトからの POST / PUT には付かない
    secure: isProduction, // 本番（HTTPS）では HTTPS のときだけ送る
    path: "/",
    // rememberMe でなければ有効期限を付けず、ブラウザを閉じたら消えるクッキーにする
    ...(rememberMe ? { expires: expiresAt } : {}),
  });
}

/** セッションを削除し、クッキーも消す */
export async function destroySession(c: Context, sessionId: string) {
  await pool.query(`DELETE FROM sessions WHERE id = $1`, [sessionId]);
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}
