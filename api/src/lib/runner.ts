import { runnerToken, runnerUrl } from "../config/config.js";
import { getExercises } from "./exercises.js";

// 実行サーバー（../runner）の呼び出しと、テストケースによる採点

export type RunCase = { args: string[]; stdin: string };

/** Main.java 以外のソースファイル（フォルダは package） */
export type SourceFile = { path: string; content: string };

export type CaseResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  truncated: boolean;
  durationMs: number;
};

export type RunResult = {
  compile: { ok: boolean; output: string; durationMs: number };
  results: CaseResult[];
};

/** 実行サーバーに接続できないとき */
export class RunnerUnavailableError extends Error {}

export async function runJava(code: string, cases: RunCase[], files: SourceFile[] = []): Promise<RunResult> {
  let response: Response;
  try {
    response = await fetch(`${runnerUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${runnerToken}` },
      body: JSON.stringify({ code, files, cases }),
      // 順番待ち（最大で数件分）と、テストケースの数だけの実行を見込む
      signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    throw new RunnerUnavailableError(`実行サーバーに接続できません: ${(error as Error).message}`);
  }
  if (!response.ok) {
    throw new RunnerUnavailableError(`実行サーバーがエラーを返しました（${response.status}）`);
  }
  return (await response.json()) as RunResult;
}

/** 出力を比べるときは、改行コードと前後の空白・改行の違いを無視する */
function normalize(text: string) {
  return text.replace(/\r\n/g, "\n").trim();
}

export type GradeResult = {
  input: string;
  expected: string;
  actual: string;
  ok: boolean;
  label: string | null;
  hidden: boolean;
  /** 実行時のエラー（例外・時間切れなど）。合否の理由として表示する */
  error: string | null;
};

export type Grade = {
  compile: RunResult["compile"];
  results: GradeResult[];
  /** graded = 全テスト合格が提出の条件。open = 自由制作（コンパイルが通れば提出できる。テストは目安） */
  mode: "graded" | "open";
};

/**
 * レッスンのテストケースでコードを採点する。結果は伏せずに返す（提出の記録として研修担当者が見る）。
 * 受講者に返すときは maskHidden で、非公開のテストケースの入力と期待する出力を伏せる。
 */
export async function gradeCode(lessonId: number, code: string, questionNo = 1, files: SourceFile[] = []): Promise<Grade | null> {
  const question = (await getExercises(lessonId)).find((q) => q.number === questionNo);
  if (!question) return null;
  const tests = { rows: question.tests.map((t) => ({ ...t, label: t.label ?? null, stdin: t.stdin ?? "", expected_stdout: t.expected })) };

  const run = await runJava(
    code,
    tests.rows.map((t) => ({ args: t.args, stdin: t.stdin })),
    files,
  );
  if (!run.compile.ok) {
    return { compile: run.compile, results: [], mode: question.mode };
  }

  const results = tests.rows.map((t, i): GradeResult => {
    const r = run.results[i];
    const error = r.timedOut
      ? "時間内に終わりませんでした（無限ループの可能性があります）"
      : r.exitCode !== 0
        ? r.stderr.split("\n").find((line) => line.trim()) ?? `終了コード ${r.exitCode}`
        : null;
    const ok = error === null && normalize(r.stdout) === normalize(t.expected_stdout);
    const input = [t.args.join(" "), t.stdin ? `（標準入力: ${t.stdin}）` : ""].filter(Boolean).join(" ");
    return { input, expected: t.expected_stdout, actual: normalize(r.stdout), ok, label: t.label, hidden: t.hidden, error };
  });
  return { compile: run.compile, results, mode: question.mode };
}

/** 提出してよい採点結果か。自由制作はコンパイルが通れば、それ以外は全テストに合格していれば */
export function canSubmitGrade(grade: Grade) {
  if (!grade.compile.ok) return false;
  if (grade.mode === "open") return true;
  return grade.results.length > 0 && grade.results.every((result) => result.ok);
}

/** 受講者に返す前に、非公開のテストケースの入力・期待する出力・実際の出力を伏せる */
export function maskHiddenResults(results: GradeResult[]): GradeResult[] {
  return results.map((r) =>
    r.hidden
      ? {
          ...r,
          input: "（非公開）",
          expected: "（非公開）",
          actual: r.ok ? "" : "（非公開）",
          error: r.error ? "実行時にエラーが発生しました" : null,
        }
      : r,
  );
}

export function maskHidden(grade: Grade): Grade {
  return { ...grade, results: maskHiddenResults(grade.results) };
}

/* ---------- 対話型の実行（実行サーバーのセッションを中継する） ---------- */

export type SessionOutput = {
  output: string;
  exited: boolean;
  exitCode: number | null;
  stopped: "output" | "time" | null;
};

export type SessionStart = { compile: RunResult["compile"]; sessionId: string | null; first: SessionOutput | null };

/** 実行サーバーのセッション API を呼ぶ。セッションがもうなければ null */
async function callSession<T>(path: string, method: "POST" | "DELETE", body?: unknown): Promise<T | null> {
  let response: Response;
  try {
    response = await fetch(`${runnerUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${runnerToken}` },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    throw new RunnerUnavailableError(`実行サーバーに接続できません: ${(error as Error).message}`);
  }
  if (response.status === 404) return null;
  if (response.status === 503) throw new RunnerBusyError("対話の実行が混み合っています。少し待ってからお試しください");
  if (!response.ok) throw new RunnerUnavailableError(`実行サーバーがエラーを返しました（${response.status}）`);
  return (await response.json()) as T;
}

/** 同時に動かせる対話の数を超えたとき */
export class RunnerBusyError extends Error {}

export async function startRunnerSession(code: string, files: SourceFile[]) {
  return (await callSession<SessionStart>("/sessions", "POST", { code, files }))!;
}

export function sendRunnerInput(sessionId: string, line: string) {
  return callSession<SessionOutput>(`/sessions/${sessionId}/input`, "POST", { line });
}

export function readRunnerOutput(sessionId: string) {
  return callSession<SessionOutput>(`/sessions/${sessionId}/read`, "POST", {});
}

export async function stopRunnerSession(sessionId: string) {
  await callSession(`/sessions/${sessionId}`, "DELETE").catch(() => {});
}
