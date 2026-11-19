import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { pool } from "../db.js";
import { getLessonStages } from "../lib/progress.js";
import { readLessonMaterial } from "../lib/lesson-material.js";
import { getPublicExercises } from "../lib/exercises.js";
import { canSubmitGrade, gradeCode, maskHidden, maskHiddenResults, RunnerBusyError, runJava, RunnerUnavailableError, type GradeResult } from "../lib/runner.js";
import { closeSession, openSession, ownsSession, readOutput, sendInput } from "../lib/sessions.js";
import { authMiddleware, requirePasswordChanged } from "../middleware/authMiddleware.js";
import { rateLimit } from "../middleware/rateLimitMiddleware.js";
import { lessonIdSchema } from "../schemas/lessons.js";
import {
  createSubmissionSchema,
  draftContentSchemas,
  draftKindSchema,
  gradeCodeSchema,
  runCodeSchema,
  sessionIdSchema,
  sessionInputSchema,
  sessionStartSchema,
} from "../schemas/submissions.js";
import type { AppEnv } from "../types/auth.js";

const lessons = new Hono<AppEnv>();

// 自分の進捗つきでレッスンを取る。進捗の行がないレッスンは locked
const SELECT_LESSONS = `
  SELECT l.id, l.number, l.level, l.multi_file, l.title, l.summary, l.minutes,
         COALESCE(p.status, 'locked') AS status
  FROM (SELECT lessons.*, ROW_NUMBER() OVER (ORDER BY sort_order, id)::int AS number FROM lessons) l
  LEFT JOIN lesson_progress p
    ON p.lesson_id = l.id
   AND p.user_id = $1
`;

//レッスン一覧（サインイン不要。紹介ページ用で、進捗は含まない）
lessons.get("/catalog", async (c) => {
  const result = await pool.query(`
    SELECT id, title, minutes, ROW_NUMBER() OVER (ORDER BY sort_order, id)::int AS number
    FROM lessons
    ORDER BY sort_order
  `);
  return c.json({ lessons: result.rows });
});

//ここから下はサインイン必須
lessons.use("*", authMiddleware, requirePasswordChanged);
lessons.use("*", async (c, next) => {
  const raw = c.req.query("question") ?? "1";
  if (!/^[1-5]$/.test(raw)) return c.json({ message: "問題番号は1〜5を指定してください" }, 400);
  c.set("questionNo", Number(raw));
  await next();
});

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
  const lesson = result.rows[0];
  const material_md = lesson.status === "locked" ? null : await readLessonMaterial(lesson.id, lesson.title);
  const exercises = lesson.status === "locked" ? [] : await getPublicExercises(lesson.id);
  return c.json({ lesson: { ...lesson, material_md, exercises } });
});

//自分の提出の状況。フロー図・コードそれぞれの段階と、最新の提出（エディタの復元用）、提出の履歴
lessons.get("/:id/submissions", async (c) => {
  const id = lessonIdSchema.safeParse(c.req.param("id"));
  if (!id.success) {
    return c.json({ message: "入力内容が正しくありません" }, 400);
  }
  const userId = c.get("user").id;

  const stages = await getLessonStages(userId, id.data, pool, c.get("questionNo"));
  if (!stages) {
    return c.json({ message: "レッスンが見つかりません" }, 404);
  }

  const history = await pool.query(
    `
    SELECT id, question_no, kind, content, auto_results, status, review_comment, reviewed_at, created_at
    FROM submissions
    WHERE user_id = $1 AND lesson_id = $2 AND question_no = $3
    ORDER BY created_at DESC
    `,
    [userId, id.data, c.get("questionNo")],
  );
  // コードの採点結果は伏せずに保存しているので、受講者に返す前に非公開のテストケースを伏せる
  for (const row of history.rows) {
    if (row.kind === "code" && Array.isArray(row.auto_results)) {
      row.auto_results = maskHiddenResults(row.auto_results as GradeResult[]);
    }
  }
  const latest = (kind: string) => history.rows.find((r) => r.kind === kind) ?? null;

  const drafts = await pool.query(
    `SELECT kind, content, updated_at FROM drafts WHERE user_id = $1 AND lesson_id = $2 AND question_no = $3`,
    [userId, id.data, c.get("questionNo")],
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
lessons.put("/:id/drafts/:kind", bodyLimit({ maxSize: 200 * 1024 }), async (c) => {
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

  const stages = await getLessonStages(userId, id.data, pool, c.get("questionNo"));
  if (!stages) {
    return c.json({ message: "レッスンが見つかりません" }, 404);
  }
  if (stages.lessonStatus === "locked") {
    return c.json({ message: "このレッスンはまだ解放されていません" }, 409);
  }

  const result = await pool.query(
    `
    INSERT INTO drafts (user_id, lesson_id, kind, content, question_no)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id, lesson_id, question_no, kind)
    DO UPDATE SET content = EXCLUDED.content, updated_at = now()
    RETURNING updated_at
    `,
    [userId, id.data, kind.data, JSON.stringify(content.data), c.get("questionNo")],
  );
  return c.json({ savedAt: result.rows[0].updated_at });
});

//提出（フロー図 or コード）。フロー図が承認されるまで、コードは提出できない
lessons.post("/:id/submissions", bodyLimit({ maxSize: 200 * 1024 }), async (c) => {
  const id = lessonIdSchema.safeParse(c.req.param("id"));
  const body = createSubmissionSchema.safeParse(await c.req.json().catch(() => null));
  if (!id.success || !body.success) {
    return c.json({ message: "入力内容が正しくありません" }, 400);
  }
  const userId = c.get("user").id;
  const { kind, content } = body.data;

  const stages = await getLessonStages(userId, id.data, pool, c.get("questionNo"));
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

  // 自動採点の結果。コードはサーバーで実際に動かして採点し直す（ブラウザから送られた結果は使わない）。
  // フロー図の採点はブラウザのルールベースのまま（参考として表示するだけ）
  let autoResults: unknown[] | null = body.data.autoResults ?? null;
  if (body.data.kind === "code") {
    try {
      const grade = await gradeCode(id.data, body.data.content.code, c.get("questionNo"), body.data.content.files ?? []);
      if (!grade) return c.json({ message: "この問題の採点設定がないため、提出できません" }, 503);
      if (!canSubmitGrade(grade)) {
        return c.json({
          message: grade.mode === "open"
            ? "コンパイルエラーを直してからレビューを依頼してください。提出は保存されていません。"
            : "全テストに合格してからレビューを依頼してください。提出は保存されていません。",
          code: "TESTS_FAILED",
          grade: maskHidden(grade),
        }, 422);
      }
      autoResults = grade.results;
    } catch (error) {
      if (error instanceof RunnerUnavailableError) {
        console.error(error);
        return c.json({ message: "実行環境に接続できないため、提出できませんでした。しばらくしてからお試しください" }, 503);
      }
      throw error;
    }
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO submissions (user_id, lesson_id, kind, content, auto_results, question_no)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, kind, status, created_at
      `,
      [userId, id.data, kind, JSON.stringify(content), autoResults ? JSON.stringify(autoResults) : null, c.get("questionNo")],
    );
    // 提出した内容が最新になるので、その種類の下書きは消す
    await pool.query(`DELETE FROM drafts WHERE user_id = $1 AND lesson_id = $2 AND kind = $3 AND question_no = $4`, [userId, id.data, kind, c.get("questionNo")]);
    return c.json({ submission: result.rows[0] }, 201);
  } catch (error) {
    // 23505 = 同時に 2 回押されたときなど、レビュー待ちが 2 件目になろうとした
    if ((error as { code?: string }).code === "23505") {
      return c.json({ message: "レビュー待ちの提出があります。結果が出るまでお待ちください" }, 409);
    }
    throw error;
  }
});

/* ---------- コードの実行・採点（実行サーバーで本当に動かす） ---------- */

const RUN_LIMIT = 30; // 1 人あたり 1 分間に
const RUN_WINDOW_SECONDS = 60;

/** 実行・採点の前の共通チェック。問題があれば返す応答を、なければ null */
async function checkRunnable(userId: string, lessonId: number) {
  if (!rateLimit(`run:${userId}`, RUN_LIMIT, RUN_WINDOW_SECONDS)) {
    return { status: 429 as const, message: "実行の回数が多すぎます。少し待ってからお試しください" };
  }
  const stages = await getLessonStages(userId, lessonId);
  if (!stages) return { status: 404 as const, message: "レッスンが見つかりません" };
  if (stages.lessonStatus === "locked") return { status: 409 as const, message: "このレッスンはまだ解放されていません" };
  return null;
}

//実行（コマンドライン引数と標準入力を指定して 1 回動かす）
lessons.post("/:id/run", bodyLimit({ maxSize: 200 * 1024 }), async (c) => {
  const id = lessonIdSchema.safeParse(c.req.param("id"));
  const body = runCodeSchema.safeParse(await c.req.json().catch(() => null));
  if (!id.success || !body.success) {
    return c.json({ message: "入力内容が正しくありません" }, 400);
  }
  const problem = await checkRunnable(c.get("user").id, id.data);
  if (problem) return c.json({ message: problem.message }, problem.status);

  try {
    const run = await runJava(body.data.code, [{ args: body.data.args, stdin: body.data.stdin }], body.data.files);
    return c.json({ compile: run.compile, result: run.results[0] ?? null });
  } catch (error) {
    if (error instanceof RunnerUnavailableError) {
      console.error(error);
      return c.json({ message: "実行環境に接続できません。しばらくしてからお試しください" }, 503);
    }
    throw error;
  }
});

//採点（レッスンのテストケースで動かして、出力を比べる）
lessons.post("/:id/grade", bodyLimit({ maxSize: 200 * 1024 }), async (c) => {
  const id = lessonIdSchema.safeParse(c.req.param("id"));
  const body = gradeCodeSchema.safeParse(await c.req.json().catch(() => null));
  if (!id.success || !body.success) {
    return c.json({ message: "入力内容が正しくありません" }, 400);
  }
  const problem = await checkRunnable(c.get("user").id, id.data);
  if (problem) return c.json({ message: problem.message }, problem.status);

  try {
    const grade = await gradeCode(id.data, body.data.code, c.get("questionNo"), body.data.files);
    if (!grade) {
      return c.json({ message: "このレッスンにはテストケースがありません" }, 404);
    }
    return c.json(maskHidden(grade));
  } catch (error) {
    if (error instanceof RunnerUnavailableError) {
      console.error(error);
      return c.json({ message: "実行環境に接続できません。しばらくしてからお試しください" }, 503);
    }
    throw error;
  }
});

/* ---------- 対話型の実行（人が 1 行入力 → プログラムが応答、を繰り返す） ---------- */

const SESSION_INPUT_LIMIT = 300; // 1 人あたり 1 分間に送れる行数
const runnerError = (c: Context<AppEnv>, error: unknown) => {
  if (error instanceof RunnerBusyError) return c.json({ message: error.message }, 503);
  if (error instanceof RunnerUnavailableError) {
    console.error(error);
    return c.json({ message: "実行環境に接続できません。しばらくしてからお試しください" }, 503);
  }
  throw error;
};

//始める（コンパイルして起動し、最初の入力待ちまでの出力を返す）。前に動かしていたものは止める
lessons.post("/:id/sessions", bodyLimit({ maxSize: 200 * 1024 }), async (c) => {
  const id = lessonIdSchema.safeParse(c.req.param("id"));
  const body = sessionStartSchema.safeParse(await c.req.json().catch(() => null));
  if (!id.success || !body.success) {
    return c.json({ message: "入力内容が正しくありません" }, 400);
  }
  const problem = await checkRunnable(c.get("user").id, id.data);
  if (problem) return c.json({ message: problem.message }, problem.status);
  try {
    return c.json(await openSession(c.get("user").id, body.data.code, body.data.files));
  } catch (error) {
    return runnerError(c, error);
  }
});

//1 行送って、次の入力待ちまでの出力を受け取る
lessons.post("/:id/sessions/:sessionId/input", bodyLimit({ maxSize: 8 * 1024 }), async (c) => {
  const sessionId = sessionIdSchema.safeParse(c.req.param("sessionId"));
  const body = sessionInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!sessionId.success || !body.success) {
    return c.json({ message: "入力内容が正しくありません" }, 400);
  }
  const userId = c.get("user").id;
  if (!ownsSession(userId, sessionId.data)) return c.json({ message: "実行は終了しています" }, 404);
  if (!rateLimit(`session:${userId}`, SESSION_INPUT_LIMIT, 60)) {
    return c.json({ message: "入力の回数が多すぎます。少し待ってからお試しください" }, 429);
  }
  try {
    const out = await sendInput(sessionId.data, body.data.line);
    return out ? c.json(out) : c.json({ message: "実行は終了しています" }, 404);
  } catch (error) {
    return runnerError(c, error);
  }
});

//入力は送らずに、続きの出力を読む（計算が長くて、まだ出力が出ていないとき）
lessons.post("/:id/sessions/:sessionId/read", async (c) => {
  const sessionId = sessionIdSchema.safeParse(c.req.param("sessionId"));
  if (!sessionId.success) return c.json({ message: "入力内容が正しくありません" }, 400);
  const userId = c.get("user").id;
  if (!ownsSession(userId, sessionId.data)) return c.json({ message: "実行は終了しています" }, 404);
  if (!rateLimit(`session:${userId}`, SESSION_INPUT_LIMIT, 60)) {
    return c.json({ message: "読み取りの回数が多すぎます。少し待ってからお試しください" }, 429);
  }
  try {
    const out = await readOutput(sessionId.data);
    return out ? c.json(out) : c.json({ message: "実行は終了しています" }, 404);
  } catch (error) {
    return runnerError(c, error);
  }
});

//止める
lessons.delete("/:id/sessions/:sessionId", async (c) => {
  const sessionId = sessionIdSchema.safeParse(c.req.param("sessionId"));
  if (!sessionId.success) return c.json({ message: "入力内容が正しくありません" }, 400);
  if (ownsSession(c.get("user").id, sessionId.data)) await closeSession(sessionId.data);
  return c.json({ stopped: true });
});

export default lessons;
