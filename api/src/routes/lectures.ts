import { Hono } from "hono";
import { pool } from "../db.js";
import { authMiddleware, requirePasswordChanged } from "../middleware/authMiddleware.js";
import { lectureIdSchema, lectureProgressSchema } from "../schemas/lectures.js";
import type { AppEnv } from "../types/auth.js";

// 講義（解説動画 + 資料）。順番の縛りはなく、どこからでも見られる
const lectures = new Hono<AppEnv>();

lectures.use("*", authMiddleware, requirePasswordChanged);

//目次。章ごとに項目を並べ、動画・資料の登録有無と、自分の「視聴・読了済み」を付ける
lectures.get("/", async (c) => {
  const chapters = await pool.query(`SELECT id, title, page_start, page_end FROM lecture_chapters ORDER BY id`);
  const items = await pool.query(
    `
    SELECT l.id, l.chapter_id, l.section, l.title,
           l.video_url IS NOT NULL AS has_video,
           l.material_md IS NOT NULL AS has_material,
           p.completed_at IS NOT NULL AS completed
    FROM lectures l
    LEFT JOIN lecture_progress p
      ON p.lecture_id = l.id
     AND p.user_id = $1
    ORDER BY l.chapter_id, l.sort_order
    `,
    [c.get("user").id],
  );

  return c.json({
    chapters: chapters.rows.map((ch) => ({
      ...ch,
      lectures: items.rows.filter((l) => l.chapter_id === ch.id),
    })),
  });
});

//講義 1 件。前後の講義（章をまたいで目次の順）も返す
lectures.get("/:id", async (c) => {
  const id = lectureIdSchema.safeParse(c.req.param("id"));
  if (!id.success) {
    return c.json({ message: "入力内容が正しくありません" }, 400);
  }

  const result = await pool.query(
    `
    WITH ordered AS (
      SELECT l.*,
             LAG(l.id)  OVER (ORDER BY l.chapter_id, l.sort_order) AS prev_id,
             LEAD(l.id) OVER (ORDER BY l.chapter_id, l.sort_order) AS next_id
      FROM lectures l
    )
    SELECT o.id, o.chapter_id, ch.title AS chapter_title, ch.page_start, ch.page_end,
           o.section, o.title, o.video_url, o.material_md, o.updated_at,
           o.prev_id, o.next_id,
           p.completed_at IS NOT NULL AS completed
    FROM ordered o
    JOIN lecture_chapters ch ON ch.id = o.chapter_id
    LEFT JOIN lecture_progress p
      ON p.lecture_id = o.id
     AND p.user_id = $1
    WHERE o.id = $2
    `,
    [c.get("user").id, id.data],
  );
  if (result.rowCount === 0) {
    return c.json({ message: "講義が見つかりません" }, 404);
  }
  return c.json({ lecture: result.rows[0] });
});

//「視聴・読了済み」のチェックを付ける・外す
lectures.put("/:id/progress", async (c) => {
  const id = lectureIdSchema.safeParse(c.req.param("id"));
  const body = lectureProgressSchema.safeParse(await c.req.json().catch(() => null));
  if (!id.success || !body.success) {
    return c.json({ message: "入力内容が正しくありません" }, 400);
  }
  const userId = c.get("user").id;

  if (body.data.completed) {
    const result = await pool.query(
      `
      INSERT INTO lecture_progress (user_id, lecture_id)
      SELECT $1, id FROM lectures WHERE id = $2
      ON CONFLICT (user_id, lecture_id) DO NOTHING
      RETURNING lecture_id
      `,
      [userId, id.data],
    );
    // 行が返らないのは「講義がない」か「すでにチェック済み」。後者は成功として扱う
    if (result.rowCount === 0) {
      const exists = await pool.query(`SELECT 1 FROM lectures WHERE id = $1`, [id.data]);
      if (exists.rowCount === 0) {
        return c.json({ message: "講義が見つかりません" }, 404);
      }
    }
  } else {
    await pool.query(`DELETE FROM lecture_progress WHERE user_id = $1 AND lecture_id = $2`, [userId, id.data]);
  }

  return c.json({ completed: body.data.completed });
});

export default lectures;
