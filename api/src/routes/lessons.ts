import { Hono } from "hono";
import { pool } from "../db.js";
import { authMiddleware, requirePasswordChanged } from "../middleware/authMiddleware.js";
import { lessonIdSchema, updateProgressSchema } from "../schemas/lessons.js";
import type { AppEnv } from "../types/auth.js";

const lessons = new Hono<AppEnv>();

// 自分の進捗つきでレッスンを取る。進捗の行がないレッスンは locked
const SELECT_LESSONS = `
  SELECT l.id, l.title, l.summary, l.minutes,
         COALESCE(p.status, 'locked') AS status
  FROM lessons l
  LEFT JOIN lesson_progress p
    ON p.lesson_id = l.id
   AND p.user_id = $1
`;

//レッスン一覧（サインイン不要。紹介ページ用で、進捗は含まない）
lessons.get("/catalog", async (c) => {
  const result = await pool.query(`
    SELECT id, title, minutes
    FROM lessons
    ORDER BY sort_order
  `);
  return c.json({ lessons: result.rows });
});

//ここから下はサインイン必須
lessons.use("*", authMiddleware, requirePasswordChanged);

//自分の進捗つきレッスン一覧
lessons.get("/", async (c) => {
  const result = await pool.query(`${SELECT_LESSONS} ORDER BY l.sort_order`, [c.get("user").id]);
  return c.json({ lessons: result.rows });
});

//レッスン 1 件
lessons.get("/:id", async (c) => {
  const id = lessonIdSchema.safeParse(c.req.param("id"));
  if (!id.success) {
    return c.json({ message: "入力内容が正しくありません" }, 400);
  }

  const result = await pool.query(`${SELECT_LESSONS} WHERE l.id = $2`, [c.get("user").id, id.data]);
  if (result.rowCount === 0) {
    return c.json({ message: "レッスンが見つかりません" }, 404);
  }
  return c.json({ lesson: result.rows[0] });
});

//進捗の更新。未解放のレッスンは更新できず、完了にすると次のレッスンを解放する
lessons.put("/:id/progress", async (c) => {
  const id = lessonIdSchema.safeParse(c.req.param("id"));
  const body = updateProgressSchema.safeParse(await c.req.json().catch(() => null));
  if (!id.success || !body.success) {
    return c.json({ message: "入力内容が正しくありません" }, 400);
  }
  const userId = c.get("user").id;
  const lessonId = id.data;
  const status = body.data.status;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 対象レッスンと今の状態
    const current = await client.query(
      `
      SELECT l.sort_order, COALESCE(p.status, 'locked') AS status
      FROM lessons l
      LEFT JOIN lesson_progress p
        ON p.lesson_id = l.id
       AND p.user_id = $1
      WHERE l.id = $2
      `,
      [userId, lessonId],
    );
    if (current.rowCount === 0) {
      await client.query("ROLLBACK");
      return c.json({ message: "レッスンが見つかりません" }, 404);
    }
    if (current.rows[0].status === "locked") {
      await client.query("ROLLBACK");
      return c.json({ message: "このレッスンはまだ解放されていません" }, 409);
    }

    await client.query(
      `
      INSERT INTO lesson_progress (user_id, lesson_id, status)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, lesson_id)
      DO UPDATE SET status = EXCLUDED.status, updated_at = now()
      `,
      [userId, lessonId, status],
    );

    // 完了にしたら、次のレッスンを学習中にする（すでに進捗があればそのまま）
    let unlocked: number | null = null;
    if (status === "completed") {
      const next = await client.query(
        `
        INSERT INTO lesson_progress (user_id, lesson_id, status)
        SELECT $1, id, 'in-progress'
        FROM lessons
        WHERE sort_order > $2
        ORDER BY sort_order
        LIMIT 1
        ON CONFLICT (user_id, lesson_id) DO NOTHING
        RETURNING lesson_id
        `,
        [userId, current.rows[0].sort_order],
      );
      unlocked = next.rows[0]?.lesson_id ?? null;
    }

    await client.query("COMMIT");
    return c.json({ progress: { lessonId, status }, unlocked });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

export default lessons;
