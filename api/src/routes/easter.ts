import { createHash, timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { pool } from "../db.js";
import { authMiddleware, requirePasswordChanged } from "../middleware/authMiddleware.js";
import { rateLimit } from "../middleware/rateLimitMiddleware.js";
import { flagSchema } from "../schemas/easter.js";
import type { AppEnv } from "../types/auth.js";

// イースターエッグ（CTF 風の隠し要素）。仕掛けは runner/src/eggs.ts。
// フラグそのものはソースに書かず、SHA-256 のハッシュだけを持つ
export const EGGS = ["duke", "tux", "gopher"] as const;
export type Egg = (typeof EGGS)[number];

const FLAG_HASHES: Record<Egg, Buffer> = {
  duke: Buffer.from("3b3f8ebcb13c1b0f02c62b945792e6cad1433db3477da73245e284414124dcbb", "hex"),
  tux: Buffer.from("4c1d877b1b6fd8fd648055ed6b2fa60cd039f470fd328d67a9948b3d4a03343d", "hex"),
  gopher: Buffer.from("13b6fc4e816626403f9c42e512d18e6877f7d70649c6880b42284b8790eca443", "hex"),
};

const SUBMIT_LIMIT = 10; // 1 人あたり 1 分間に
const SUBMIT_WINDOW_SECONDS = 60;

/** 自分がクリアしたバッジと日時 */
async function solvedEggs(userId: string) {
  const result = await pool.query(`SELECT egg, solved_at FROM easter_eggs WHERE user_id = $1`, [userId]);
  return Object.fromEntries(result.rows.map((r) => [r.egg, r.solved_at])) as Partial<Record<Egg, string>>;
}

const easter = new Hono<AppEnv>();
easter.use("*", authMiddleware, requirePasswordChanged);

easter.get("/", async (c) => {
  return c.json({ solved: await solvedEggs(c.get("user").id) });
});

//フラグの答え合わせ。どのバッジのフラグかを調べ、正解なら記録する（2 回目以降は最初の日時のまま）
easter.post("/flag", async (c) => {
  const parsed = flagSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ message: "フラグを入力してください" }, 400);
  }
  const userId = c.get("user").id;
  if (!rateLimit(`flag:${userId}`, SUBMIT_LIMIT, SUBMIT_WINDOW_SECONDS)) {
    return c.json({ message: "試行回数が多すぎます。少し待ってからお試しください" }, 429);
  }

  const digest = createHash("sha256").update(parsed.data.flag, "utf8").digest();
  const egg = EGGS.find((e) => timingSafeEqual(digest, FLAG_HASHES[e])) ?? null;
  if (egg) {
    await pool.query(`INSERT INTO easter_eggs (user_id, egg) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userId, egg]);
  }
  return c.json({ egg, solved: await solvedEggs(userId) });
});

export default easter;
