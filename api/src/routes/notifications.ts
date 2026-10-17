import { Hono } from "hono";
import { z } from "zod";
import { pool } from "../db.js";
import { authMiddleware, requirePasswordChanged } from "../middleware/authMiddleware.js";
import type { AppEnv } from "../types/auth.js";

const notifications = new Hono<AppEnv>();
notifications.use("*", authMiddleware, requirePasswordChanged);
notifications.use("*", async (c, next) => {
  if (c.get("user").role !== "user") return c.json({ message: "受講者向けの通知です" }, 403);
  await next();
});

notifications.get("/", async (c) => {
  const result = await pool.query(`
    WITH reviews AS (
      SELECT s.id,s.lesson_id,s.question_no,s.kind,s.status,s.review_comment,s.reviewed_at,s.review_read_at,
             l.title AS lesson_title,
             (SELECT count(*)::int FROM lessons previous WHERE previous.sort_order <= l.sort_order) AS lesson_number
      FROM submissions s JOIN lessons l ON l.id=s.lesson_id
      WHERE s.user_id=$1 AND s.status IN ('approved','rejected') AND s.reviewed_at IS NOT NULL
    ), recent AS (
      SELECT * FROM reviews ORDER BY (review_read_at IS NULL) DESC,reviewed_at DESC,id DESC LIMIT 30
    )
    SELECT (SELECT count(*)::int FROM reviews WHERE review_read_at IS NULL) AS unread_count,
           (SELECT count(*)::text || ':' || COALESCE(max(reviewed_at)::text,'') FROM reviews) AS review_version,
           COALESCE((SELECT json_agg(recent ORDER BY (review_read_at IS NULL) DESC,reviewed_at DESC,id DESC) FROM recent),'[]'::json) AS notifications
  `, [c.get("user").id]);
  return c.json(result.rows[0]);
});

notifications.post("/:id/read", async (c) => {
  const id = z.uuid().safeParse(c.req.param("id"));
  if (!id.success) return c.json({ message: "通知IDが正しくありません" }, 400);
  const result = await pool.query(`
    UPDATE submissions SET review_read_at=COALESCE(review_read_at,now())
    WHERE id=$1 AND user_id=$2 AND status IN ('approved','rejected') AND reviewed_at IS NOT NULL
    RETURNING id,review_read_at
  `, [id.data,c.get("user").id]);
  if (result.rowCount === 0) return c.json({ message: "通知が見つかりません" }, 404);
  return c.json({ notification: result.rows[0] });
});

export default notifications;
