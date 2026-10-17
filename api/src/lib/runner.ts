import { runnerToken, runnerUrl } from "../config/config.js";
import { getExercises } from "./exercises.js";

// 実行サーバー（../runner）の呼び出しと、テストケースによる採点

export type RunCase = { args: string[]; stdin: string };

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

export async function runJava(code: string, cases: RunCase[]): Promise<RunResult> {
  let response: Response;
  try {
    response = await fetch(`${runnerUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${runnerToken}` },
      body: JSON.stringify({ code, cases }),
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
};

/**
 * レッスンのテストケースでコードを採点する。結果は伏せずに返す（提出の記録として研修担当者が見る）。
 * 受講者に返すときは maskHidden で、非公開のテストケースの入力と期待する出力を伏せる。
 */
export async function gradeCode(lessonId: number, code: string, questionNo = 1): Promise<Grade | null> {
  const question = (await getExercises(lessonId)).find((q) => q.number === questionNo);
  if (!question) return null;
  const tests = { rows: question.tests.map((t) => ({ ...t, label: t.label ?? null, stdin: "", expected_stdout: t.expected })) };

  const run = await runJava(
    code,
    tests.rows.map((t) => ({ args: t.args, stdin: t.stdin })),
  );
  if (!run.compile.ok) {
    return { compile: run.compile, results: [] };
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
  return { compile: run.compile, results };
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
