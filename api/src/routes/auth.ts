import argon2 from "argon2";
import { Hono } from "hono";
import { getConnInfo } from "@hono/node-server/conninfo";
import { z } from "zod";
import { pool } from "../db.js";
import { createSession, destroySession } from "../lib/session.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { rateLimit } from "../middleware/rateLimitMiddleware.js";
import { changePasswordSchema, loginSchema } from "../schemas/auth.js";
import type { AppEnv } from "../types/auth.js";

const auth = new Hono<AppEnv>();

const EMPLOYEE_COUNT = 5;
const IP_COUNT = 20;
const WINDOW_SECONDS = 60;

// 存在しない社員番号でも同じだけ時間をかけ、応答時間から登録の有無を推測させない
const dummyHash = await argon2.hash("dummy-password-for-timing");

//サインイン
auth.post("/login", async (c) => {
  const parsed = loginSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ message: "入力内容が正しくありません" }, 400);
  }
  const { employeeNo, password, rememberMe } = parsed.data;

  const ip = getConnInfo(c).remote.address ?? "unknown";
  const employeeAllowed = rateLimit(`login:employee:${employeeNo}`, EMPLOYEE_COUNT, WINDOW_SECONDS);
  const ipAllowed = rateLimit(`login:ip:${ip}`, IP_COUNT, WINDOW_SECONDS);
  if (!employeeAllowed || !ipAllowed) {
    return c.json({ message: "試行回数が多すぎます。しばらく待ってからお試しください" }, 429);
  }

  const result = await pool.query(
    `
    SELECT id, password_hash
    FROM users
    WHERE employee_no = $1
    `,
    [employeeNo],
  );
  const user = result.rows[0];

  const valid = await argon2.verify(user?.password_hash ?? dummyHash, password);
  if (!user || !valid) {
    // 社員番号とパスワードのどちらが違うかは教えない
    return c.json({ message: "社員番号またはパスワードが正しくありません" }, 401);
  }

  await createSession(c, user.id, rememberMe);
  return c.json({ message: "サインインしました" });
});

//サインアウト
auth.post("/logout", authMiddleware, async (c) => {
  await destroySession(c, c.get("user").sessionId);
  return c.json({ message: "サインアウトしました" });
});

//自分の情報
auth.get("/me", authMiddleware, (c) => {
  const { sessionId: _, ...user } = c.get("user");
  return c.json({ user });
});

//パスワード変更（初期パスワードからの変更もここ）
auth.post("/password", authMiddleware, async (c) => {
  const parsed = changePasswordSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json(
      { message: "入力内容が正しくありません", fieldErrors: z.flattenError(parsed.error).fieldErrors },
      400,
    );
  }
  const { currentPassword, newPassword } = parsed.data;
  const user = c.get("user");

  const result = await pool.query(`SELECT password_hash FROM users WHERE id = $1`, [user.id]);
  if (!(await argon2.verify(result.rows[0].password_hash, currentPassword))) {
    return c.json({ message: "現在のパスワードが正しくありません" }, 400);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `
      UPDATE users
      SET password_hash = $1, must_change_password = false, updated_at = now()
      WHERE id = $2
      `,
      [await argon2.hash(newPassword), user.id],
    );
    // ほかの端末のセッションは無効にする（今の端末はそのまま）
    await client.query(`DELETE FROM sessions WHERE user_id = $1 AND id <> $2`, [user.id, user.sessionId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return c.json({ message: "パスワードを変更しました" });
});

export default auth;
