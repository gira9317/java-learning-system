import type pg from "pg";
import { pool } from "../db.js";

export type SubmissionKind = "flow" | "code";
export type SubmissionStatus = "pending" | "approved" | "rejected";

/** フロー図・コードそれぞれの段階。none = まだ提出していない */
export type StageStatus = "none" | SubmissionStatus;

export type LessonStages = {
  lessonStatus: "completed" | "in-progress" | "locked";
  flow: { status: StageStatus; canSubmit: boolean };
  code: { status: StageStatus; canSubmit: boolean };
};

type Queryable = pg.Pool | pg.PoolClient;

/**
 * レッスンの今の段階を、進捗と「種類ごとの最新の提出」から求める。
 * 提出できるのは: レッスンが学習中で、その種類の最新が「未提出」か「差し戻し」のとき。
 * コードはさらに、フロー図が承認済みのときだけ。
 */
export async function getLessonStages(userId: string, lessonId: number, db: Queryable = pool, questionNo = 1): Promise<LessonStages | null> {
  const lesson = await db.query(
    `
    SELECT COALESCE(p.status, 'locked') AS status, l.level
    FROM lessons l
    LEFT JOIN lesson_progress p
      ON p.lesson_id = l.id
     AND p.user_id = $1
    WHERE l.id = $2
    `,
    [userId, lessonId],
  );
  if (lesson.rowCount === 0) return null;
  const lessonStatus = lesson.rows[0].status;
  const codeOnly = lesson.rows[0].level !== "core";

  const latest = await db.query(
    `
    SELECT DISTINCT ON (kind) kind, status
    FROM submissions
    WHERE user_id = $1 AND lesson_id = $2 AND question_no = $3
    ORDER BY kind, created_at DESC
    `,
    [userId, lessonId, questionNo],
  );
  const statusOf = (kind: SubmissionKind): StageStatus => latest.rows.find((r) => r.kind === kind)?.status ?? "none";

  const flow = statusOf("flow");
  const code = statusOf("code");
  const open = lessonStatus === "in-progress";
  const submittable = (s: StageStatus) => s === "none" || s === "rejected";

  return {
    lessonStatus,
    flow: { status: flow, canSubmit: !codeOnly && open && submittable(flow) },
    code: { status: code, canSubmit: open && (codeOnly || flow === "approved") && submittable(code) },
  };
}

/**
 * レッスンを完了にし、次のレッスンを学習中にする（すでに進捗があればそのまま）。
 * コードの提出が承認されたときに、呼び出し側のトランザクションの中で使う。
 * 解放したレッスンの ID を返す。
 */
export async function completeLesson(client: pg.PoolClient, userId: string, lessonId: number) {
  const approved = await client.query(
    `SELECT count(DISTINCT question_no)::int AS count FROM submissions
     WHERE user_id = $1 AND lesson_id = $2 AND kind = 'code' AND status = 'approved'`,
    [userId, lessonId],
  );
  if (approved.rows[0].count < 5) return null;
  await client.query(
    `
    INSERT INTO lesson_progress (user_id, lesson_id, status)
    VALUES ($1, $2, 'completed')
    ON CONFLICT (user_id, lesson_id)
    DO UPDATE SET status = 'completed', updated_at = now()
    `,
    [userId, lessonId],
  );

  const next = await client.query(
    `
    INSERT INTO lesson_progress (user_id, lesson_id, status)
    SELECT $1, id, 'in-progress'
    FROM lessons
    WHERE sort_order > (SELECT sort_order FROM lessons WHERE id = $2)
    ORDER BY sort_order
    LIMIT 1
    ON CONFLICT (user_id, lesson_id) DO NOTHING
    RETURNING lesson_id
    `,
    [userId, lessonId],
  );
  return (next.rows[0]?.lesson_id as number | undefined) ?? null;
}
