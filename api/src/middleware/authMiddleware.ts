import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { pool } from "../db.js";
import { hashToken, SESSION_COOKIE } from "../lib/session.js";
import type { AppEnv } from "../types/auth.js";

/**
 * サインイン必須のルートに付ける。
 * クッキーのトークン → sessions → users の順にたどり、c.set("user") する。
 */
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) {
    return c.json({ message: "サインインしてください" }, 401);
  }

  const sessionId = hashToken(token);
  const result = await pool.query(
    `
    SELECT u.id, u.employee_no, u.name, u.role, u.must_change_password
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = $1
      AND s.expires_at > now()
    `,
    [sessionId],
  );

  if (result.rowCount === 0) {
    return c.json({ message: "サインインしてください" }, 401);
  }

  const row = result.rows[0];
  c.set("user", {
    id: row.id,
    employeeNo: row.employee_no,
    name: row.name,
    role: row.role,
    mustChangePassword: row.must_change_password,
    sessionId,
  });

  await next();
});

/**
 * 初期パスワードのままのユーザーを止める。authMiddleware の後に付ける。
 * パスワード変更と自分の情報の取得（/auth/*）以外のルートで使う。
 */
export const requirePasswordChanged = createMiddleware<AppEnv>(async (c, next) => {
  if (c.get("user").mustChangePassword) {
    return c.json({ message: "パスワードを変更してください", code: "PASSWORD_CHANGE_REQUIRED" }, 403);
  }
  await next();
});

/** 管理者（研修担当者）だけを通す。authMiddleware・requirePasswordChanged の後に付ける */
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  if (c.get("user").role !== "admin") {
    return c.json({ message: "この操作は研修担当者のみ行えます" }, 403);
  }
  await next();
});
