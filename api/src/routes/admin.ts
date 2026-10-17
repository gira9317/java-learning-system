import argon2 from "argon2";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { pool } from "../db.js";
import { createAccount } from "../lib/accounts.js";
import { generateInitialPassword } from "../lib/password.js";
import { completeLesson } from "../lib/progress.js";
import { authMiddleware, requireAdmin, requirePasswordChanged } from "../middleware/authMiddleware.js";
import { createUserSchema } from "../schemas/admin.js";
import { lectureIdSchema, updateLectureSchema } from "../schemas/lectures.js";
import { approveSchema, rejectSchema, submissionListQuerySchema } from "../schemas/submissions.js";
import type { AppEnv } from "../types/auth.js";

const admin = new Hono<AppEnv>();

//すべて研修担当者のみ
admin.use("*", authMiddleware, requirePasswordChanged, requireAdmin);

const uuidSchema = z.uuid();
const ALREADY_REVIEWED = "レビュー待ちの提出が見つかりません（すでにレビュー済みの可能性があります）";

/* ---------- ダッシュボード ---------- */

//ナビのバッジ用。レビュー待ちの件数
admin.get("/summary", async (c) => {
  const result = await pool.query(`SELECT COUNT(*)::int AS pending FROM submissions WHERE status = 'pending'`);
  return c.json({ pendingCount: result.rows[0].pending });
});

/* ---------- 受講者 ---------- */

//受講者の一覧（進み具合とレビュー待ちの件数つき）
admin.get("/users", async (c) => {
  const result = await pool.query(`
    SELECT u.id, u.employee_no, u.name, u.role, u.must_change_password, u.created_at,
           COUNT(p.*) FILTER (WHERE p.status = 'completed')::int AS completed_count,
           (SELECT COUNT(*)::int FROM lessons) AS lesson_count,
           (SELECT l.title FROM lesson_progress cp JOIN lessons l ON l.id = cp.lesson_id
             WHERE cp.user_id = u.id AND cp.status = 'in-progress'
             ORDER BY l.sort_order LIMIT 1) AS current_lesson,
           (SELECT COUNT(*)::int FROM submissions s WHERE s.user_id = u.id AND s.status = 'pending') AS pending_count,
           GREATEST(MAX(p.updated_at), (SELECT MAX(s.created_at) FROM submissions s WHERE s.user_id = u.id)) AS last_activity_at
    FROM users u
    LEFT JOIN lesson_progress p ON p.user_id = u.id
    GROUP BY u.id
    ORDER BY u.role DESC, u.employee_no
  `);
  return c.json({ users: result.rows });
});

//アカウントの発行。初期パスワードはランダムに作り、この応答で一度だけ返す
admin.post("/users", async (c) => {
  const parsed = createUserSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json(
      { message: "入力内容が正しくありません", fieldErrors: z.flattenError(parsed.error).fieldErrors },
      400,
    );
  }

  const initialPassword = generateInitialPassword();
  try {
    const user = await createAccount({ ...parsed.data, password: initialPassword });
    return c.json({ user, initialPassword }, 201);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return c.json({ message: `社員番号 ${parsed.data.employeeNo} はすでに登録されています` }, 409);
    }
    throw error;
  }
});

//受講者 1 人の詳細。レッスンごとの状態と、すべての提出
admin.get("/users/:id", async (c) => {
  const id = uuidSchema.safeParse(c.req.param("id"));
  if (!id.success) {
    return c.json({ message: "入力内容が正しくありません" }, 400);
  }

  const user = await pool.query(
    `SELECT id, employee_no, name, role, must_change_password, created_at FROM users WHERE id = $1`,
    [id.data],
  );
  if (user.rowCount === 0) {
    return c.json({ message: "ユーザーが見つかりません" }, 404);
  }

  const lessons = await pool.query(
    `
    SELECT l.id, l.title, COALESCE(p.status, 'locked') AS status,
           (SELECT s.status FROM submissions s WHERE s.user_id = $1 AND s.lesson_id = l.id AND s.kind = 'flow'
             ORDER BY s.created_at DESC LIMIT 1) AS flow_status,
           (SELECT s.status FROM submissions s WHERE s.user_id = $1 AND s.lesson_id = l.id AND s.kind = 'code'
             ORDER BY s.created_at DESC LIMIT 1) AS code_status
    FROM lessons l
    LEFT JOIN lesson_progress p ON p.lesson_id = l.id AND p.user_id = $1
    ORDER BY l.sort_order
    `,
    [id.data],
  );

  const submissions = await pool.query(
    `
    SELECT s.id, s.lesson_id, l.title AS lesson_title, s.kind, s.status, s.review_comment, s.reviewed_at, s.created_at
    FROM submissions s
    JOIN lessons l ON l.id = s.lesson_id
    WHERE s.user_id = $1
    ORDER BY s.created_at DESC
    `,
    [id.data],
  );

  return c.json({ user: user.rows[0], lessons: lessons.rows, submissions: submissions.rows });
});

//パスワードの再発行。新しい初期パスワードを一度だけ返し、その人のセッションはすべて切る
admin.post("/users/:id/reset-password", async (c) => {
  const id = uuidSchema.safeParse(c.req.param("id"));
  if (!id.success) {
    return c.json({ message: "入力内容が正しくありません" }, 400);
  }

  const initialPassword = generateInitialPassword();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `
      UPDATE users
      SET password_hash = $1, must_change_password = true, updated_at = now()
      WHERE id = $2
      RETURNING employee_no
      `,
      [await argon2.hash(initialPassword), id.data],
    );
    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return c.json({ message: "ユーザーが見つかりません" }, 404);
    }
    await client.query(`DELETE FROM sessions WHERE user_id = $1`, [id.data]);
    await client.query("COMMIT");
    return c.json({ employeeNo: result.rows[0].employee_no, initialPassword });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

/* ---------- 提出のレビュー ---------- */

//提出の一覧（?status=pending でレビュー待ちだけ。古い順）
admin.get("/submissions", async (c) => {
  const query = submissionListQuerySchema.safeParse(c.req.query());
  if (!query.success) {
    return c.json({ message: "入力内容が正しくありません" }, 400);
  }

  const result = await pool.query(
    `
    SELECT s.id, s.kind, s.status, s.created_at, s.reviewed_at,
           s.lesson_id, l.title AS lesson_title,
           u.id AS user_id, u.employee_no, u.name
    FROM submissions s
    JOIN lessons l ON l.id = s.lesson_id
    JOIN users u ON u.id = s.user_id
    WHERE ($1::text IS NULL OR s.status = $1)
    ORDER BY s.created_at ${query.data.status === "pending" ? "ASC" : "DESC"}
    LIMIT 200
    `,
    [query.data.status ?? null],
  );
  return c.json({ submissions: result.rows });
});

//提出 1 件（中身・自動採点の結果・レビュー結果）
admin.get("/submissions/:id", async (c) => {
  const id = uuidSchema.safeParse(c.req.param("id"));
  if (!id.success) {
    return c.json({ message: "入力内容が正しくありません" }, 400);
  }

  const result = await pool.query(
    `
    SELECT s.*, l.title AS lesson_title,
           u.employee_no, u.name,
           r.name AS reviewer_name
    FROM submissions s
    JOIN lessons l ON l.id = s.lesson_id
    JOIN users u ON u.id = s.user_id
    LEFT JOIN users r ON r.id = s.reviewed_by
    WHERE s.id = $1
    `,
    [id.data],
  );
  if (result.rowCount === 0) {
    return c.json({ message: "提出が見つかりません" }, 404);
  }
  return c.json({ submission: result.rows[0] });
});

//承認。コードの承認なら、レッスンを完了にして次のレッスンを解放する
admin.post("/submissions/:id/approve", async (c) => {
  const id = uuidSchema.safeParse(c.req.param("id"));
  const body = approveSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!id.success || !body.success) {
    return c.json({ message: "入力内容が正しくありません" }, 400);
  }
  const result = await review(c.get("user").id, id.data, "approved", body.data.comment ?? null);
  return result ? c.json(result) : c.json({ message: ALREADY_REVIEWED }, 409);
});

//差し戻し（コメント必須）。受講者は直して再提出する
admin.post("/submissions/:id/reject", async (c) => {
  const id = uuidSchema.safeParse(c.req.param("id"));
  const body = rejectSchema.safeParse(await c.req.json().catch(() => null));
  if (!id.success || !body.success) {
    return c.json(
      {
        message: "入力内容が正しくありません",
        fieldErrors: body.success ? undefined : z.flattenError(body.error).fieldErrors,
      },
      400,
    );
  }
  const result = await review(c.get("user").id, id.data, "rejected", body.data.comment);
  return result ? c.json(result) : c.json({ message: ALREADY_REVIEWED }, 409);
});

/** 承認・差し戻しの共通処理。レビュー待ちの提出だけを対象にし、見つからなければ null */
async function review(reviewerId: string, submissionId: string, status: "approved" | "rejected", comment: string | null) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 2 人の担当者が同時にレビューしても 1 回だけ通るよう、pending の行だけを更新する
    const result = await client.query(
      `
      UPDATE submissions
      SET status = $1, review_comment = $2, reviewed_by = $3, reviewed_at = now()
      WHERE id = $4 AND status = 'pending'
      RETURNING user_id, lesson_id, kind
      `,
      [status, comment, reviewerId, submissionId],
    );
    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const { user_id, lesson_id, kind } = result.rows[0];
    const unlocked = status === "approved" && kind === "code" ? await completeLesson(client, user_id, lesson_id) : null;

    await client.query("COMMIT");
    return { status, lessonCompleted: status === "approved" && kind === "code", unlocked };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/* ---------- 講義（動画と資料の登録） ---------- */

//講義の一覧（目次の順）。登録状況と、視聴・読了済みにした受講者の人数つき
admin.get("/lectures", async (c) => {
  const result = await pool.query(`
    SELECT l.id, l.chapter_id, ch.title AS chapter_title, l.section, l.title,
           l.video_url IS NOT NULL AS has_video,
           l.material_md IS NOT NULL AS has_material,
           l.updated_at,
           (SELECT COUNT(*)::int FROM lecture_progress p WHERE p.lecture_id = l.id) AS completed_count
    FROM lectures l
    JOIN lecture_chapters ch ON ch.id = l.chapter_id
    ORDER BY l.chapter_id, l.sort_order
  `);
  return c.json({ lectures: result.rows });
});

//講義 1 件（編集用）
admin.get("/lectures/:id", async (c) => {
  const id = lectureIdSchema.safeParse(c.req.param("id"));
  if (!id.success) {
    return c.json({ message: "入力内容が正しくありません" }, 400);
  }
  const result = await pool.query(
    `
    SELECT l.id, l.chapter_id, ch.title AS chapter_title, ch.page_start, ch.page_end,
           l.section, l.title, l.video_url, l.material_md, l.updated_at
    FROM lectures l
    JOIN lecture_chapters ch ON ch.id = l.chapter_id
    WHERE l.id = $1
    `,
    [id.data],
  );
  if (result.rowCount === 0) {
    return c.json({ message: "講義が見つかりません" }, 404);
  }
  return c.json({ lecture: result.rows[0] });
});

//動画の URL と資料（Markdown）を登録する。空にすると未登録に戻る
admin.put("/lectures/:id", bodyLimit({ maxSize: 300 * 1024 }), async (c) => {
  const id = lectureIdSchema.safeParse(c.req.param("id"));
  const body = updateLectureSchema.safeParse(await c.req.json().catch(() => null));
  if (!id.success || !body.success) {
    return c.json(
      {
        message: "入力内容が正しくありません",
        fieldErrors: body.success ? undefined : z.flattenError(body.error).fieldErrors,
      },
      400,
    );
  }

  const result = await pool.query(
    `
    UPDATE lectures
    SET video_url = $1, material_md = $2, updated_at = now()
    WHERE id = $3
    RETURNING id, updated_at
    `,
    [body.data.videoUrl, body.data.materialMd, id.data],
  );
  if (result.rowCount === 0) {
    return c.json({ message: "講義が見つかりません" }, 404);
  }
  return c.json({ lecture: result.rows[0] });
});

export default admin;
