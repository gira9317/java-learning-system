import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { pool } from "../db.js";
import { getLessonStages } from "../lib/progress.js";
import { authMiddleware, requirePasswordChanged } from "../middleware/authMiddleware.js";
import { lessonIdSchema } from "../schemas/lessons.js";
import { createSubmissionSchema, draftContentSchemas, draftKindSchema } from "../schemas/submissions.js";
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

//自分の提出の状況。フロー図・コードそれぞれの段階と、最新の提出（エディタの復元用）、提出の履歴
lessons.get("/:id/submissions", async (c) => {
  const id = lessonIdSchema.safeParse(c.req.param("id"));
  if (!id.success) {
    return c.json({ message: "入力内容が正しくありません" }, 400);
  }
  const userId = c.get("user").id;

  const stages = await getLessonStages(userId, id.data);
  if (!stages) {
    return c.json({ message: "レッスンが見つかりません" }, 404);
  }

  const history = await pool.query(
    `
    SELECT id, kind, content, auto_results, status, review_comment, reviewed_at, created_at
    FROM submissions
    WHERE user_id = $1 AND lesson_id = $2
    ORDER BY created_at DESC
    `,
    [userId, id.data],
  );
  const latest = (kind: string) => history.rows.find((r) => r.kind === kind) ?? null;

  const drafts = await pool.query(
    `SELECT kind, content, updated_at FROM drafts WHERE user_id = $1 AND lesson_id = $2`,
    [userId, id.data],
  );
  const draft = (kind: string) => drafts.rows.find((r) => r.kind === kind) ?? null;

  return c.json({
    ...stages,
    latest: { flow: latest("flow"), code: latest("code") },
    // 作業途中の内容。エディタは「下書き → 最後の提出 → 初期状態」の順に復元する
    drafts: { flow: draft("flow"), code: draft("code") },
    history: history.rows,
  });
});

//下書きの保存（画面を離れても作業途中の内容が消えないよう、エディタが自動で呼ぶ）
lessons.put("/:id/drafts/:kind", bodyLimit({ maxSize: 100 * 1024 }), async (c) => {
  const id = lessonIdSchema.safeParse(c.req.param("id"));
  const kind = draftKindSchema.safeParse(c.req.param("kind"));
  if (!id.success || !kind.success) {
    return c.json({ message: "入力内容が正しくありません" }, 400);
  }
  const content = draftContentSchemas[kind.data].safeParse(await c.req.json().catch(() => null));
  if (!content.success) {
    return c.json({ message: "入力内容が正しくありません" }, 400);
  }
  const userId = c.get("user").id;

  const stages = await getLessonStages(userId, id.data);
  if (!stages) {
    return c.json({ message: "レッスンが見つかりません" }, 404);
  }
  if (stages.lessonStatus === "locked") {
    return c.json({ message: "このレッスンはまだ解放されていません" }, 409);
  }

  const result = await pool.query(
    `
    INSERT INTO drafts (user_id, lesson_id, kind, content)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, lesson_id, kind)
    DO UPDATE SET content = EXCLUDED.content, updated_at = now()
    RETURNING updated_at
    `,
    [userId, id.data, kind.data, JSON.stringify(content.data)],
  );
  return c.json({ savedAt: result.rows[0].updated_at });
});

//提出（フロー図 or コード）。フロー図が承認されるまで、コードは提出できない
lessons.post("/:id/submissions", bodyLimit({ maxSize: 100 * 1024 }), async (c) => {
  const id = lessonIdSchema.safeParse(c.req.param("id"));
  const body = createSubmissionSchema.safeParse(await c.req.json().catch(() => null));
  if (!id.success || !body.success) {
    return c.json({ message: "入力内容が正しくありません" }, 400);
  }
  const userId = c.get("user").id;
  const { kind, content, autoResults } = body.data;

  const stages = await getLessonStages(userId, id.data);
  if (!stages) {
    return c.json({ message: "レッスンが見つかりません" }, 404);
  }
  if (!stages[kind].canSubmit) {
    const reason =
      stages.lessonStatus !== "in-progress"
        ? "このレッスンは提出できる状態ではありません"
        : stages[kind].status === "pending"
          ? "レビュー待ちの提出があります。結果が出るまでお待ちください"
          : stages[kind].status === "approved"
            ? "すでに承認されています"
            : "先にフロー図の承認を受けてください";
    return c.json({ message: reason }, 409);
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO submissions (user_id, lesson_id, kind, content, auto_results)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, kind, status, created_at
      `,
      [userId, id.data, kind, JSON.stringify(content), autoResults ? JSON.stringify(autoResults) : null],
    );
    // 提出した内容が最新になるので、その種類の下書きは消す
    await pool.query(`DELETE FROM drafts WHERE user_id = $1 AND lesson_id = $2 AND kind = $3`, [userId, id.data, kind]);
    return c.json({ submission: result.rows[0] }, 201);
  } catch (error) {
    // 23505 = 同時に 2 回押されたときなど、レビュー待ちが 2 件目になろうとした
    if ((error as { code?: string }).code === "23505") {
      return c.json({ message: "レビュー待ちの提出があります。結果が出るまでお待ちください" }, 409);
    }
    throw error;
  }
});

export default lessons;
