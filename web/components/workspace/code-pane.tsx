"use client";

import { useState } from "react";
import { ApiError } from "@/api/client";
import {
  gradeCode,
  runCode,
  type CodeContent,
  type CompileResult,
  type GradeCaseResult,
  type RunCaseResult,
} from "@/api/submissions-api";
import { CheckIcon, CodeIcon, PlayIcon, ResetIcon, XIcon } from "@/components/icons";
import { MonacoJavaEditor } from "./monaco-java-editor";
import { PaneHeader } from "./resizable-panes";
import { StageBanner, SubmitButton, type SubmitControl } from "./submission-status";
import { autosaveLabel, useAutosave } from "./use-autosave";

export const starterCode = `public class Main {
    public static void main(String[] args) {
        int score = Integer.parseInt(args[0]);

        if (score >= 60) {
            System.out.println("合格");
        }
        // TODO: 60点未満のときは「不合格」と表示する
    }
}
`;

/** 採点の結果（1 テストケース分）。ツールバーの採点結果の表示にも使う */
export type TestResult = GradeCaseResult;

type RunOutput = { args: string[]; compile: CompileResult; result: RunCaseResult | null };
type GradeOutput = { compile: CompileResult; results: GradeCaseResult[] };

/** 引数の入力欄（スペース区切り）を配列にする */
function parseArgs(text: string) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function errorMessage(e: unknown) {
  return e instanceof ApiError ? e.message : "実行環境に接続できませんでした。";
}

/**
 * コード演習の Java のペイン。
 * 「実行」「採点する」は実行サーバーで本当にコンパイル・実行する（../runner、API 経由）。
 */
export function CodePane({
  lessonId,
  questionNo = 1,
  starter = starterCode,
  initialArgs = ["80"],
  onGraded,
  initial,
  submit,
  onSubmit,
  saveDraft,
}: {
  lessonId: number;
  questionNo?: number;
  starter?: string;
  initialArgs?: string[];
  onGraded: (results: TestResult[] | null) => void;
  /** 開いたときの内容（下書き、なければ最後に提出したコード） */
  initial?: CodeContent;
  submit: SubmitControl;
  onSubmit: (content: CodeContent, results: TestResult[]) => void;
  /** 下書きの保存（手を止めたときと、ページを離れるときに自動で呼ぶ） */
  saveDraft: (content: CodeContent, options: { keepalive: boolean }) => Promise<unknown>;
}) {
  const [code, setCode] = useState(initial?.code ?? starter);
  const draftStatus = useAutosave<CodeContent>({ code }, saveDraft);
  const [argsText, setArgsText] = useState(initialArgs.join(" "));
  const [stdin, setStdin] = useState("");
  const [stdinOpen, setStdinOpen] = useState(false);
  const [tab, setTab] = useState<"output" | "tests">("output");
  // コンソールは普段たたんでおき、エディタを広く使う。実行・採点・提出したときに開く
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [running, setRunning] = useState<"run" | "grade" | null>(null);
  const [output, setOutput] = useState<RunOutput | null>(null);
  const [grade, setGrade] = useState<GradeOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const results = grade?.compile.ok ? grade.results : null;

  function update(next: string) {
    setCode(next);
    if (grade) {
      setGrade(null);
      onGraded(null);
    }
  }

  async function run() {
    const args = parseArgs(argsText);
    setTab("output");
    setConsoleOpen(true);
    setRunning("run");
    setError(null);
    try {
      const r = await runCode(lessonId, { code, args, stdin }, questionNo);
      setOutput({ args, ...r });
    } catch (e) {
      setOutput(null);
      setError(errorMessage(e));
    } finally {
      setRunning(null);
    }
  }

  /** 採点して結果を表示する。失敗したら null */
  async function runGrade() {
    setTab("tests");
    setConsoleOpen(true);
    setRunning("grade");
    setError(null);
    try {
      const g = await gradeCode(lessonId, code, questionNo);
      setGrade(g);
      onGraded(g.compile.ok ? g.results : []);
      return g;
    } catch (e) {
      setGrade(null);
      onGraded(null);
      setError(errorMessage(e));
      return null;
    } finally {
      setRunning(null);
    }
  }

  // 提出の前に採点して結果を見せる（保存される採点結果は、サーバーが提出時に採点し直したもの）
  async function handleSubmit() {
    const g = await runGrade();
    if (!g) return;
    onSubmit({ code }, g.compile.ok ? g.results : []);
  }

  const passed = results?.filter((r) => r.ok).length ?? 0;
  const busy = running !== null || submit.submitting;

  return (
    <>
      <PaneHeader icon={<CodeIcon size={16} />} title="Javaコード" dark>
        <span className="hidden type-fine text-white/45 md:inline" role="status">
          {autosaveLabel(draftStatus)}
        </span>
        <button
          type="button"
          className="btn type-caption text-white/60"
          onClick={() => update(starter)}
          aria-label="コードを初期状態に戻す"
        >
          <ResetIcon size={14} />
          <span className="hidden sm:inline">リセット</span>
        </button>
        <span className="on-dark">
          <button type="button" className="btn btn-secondary" onClick={run} disabled={busy}>
            <PlayIcon size={12} />
            実行
          </button>
        </span>
        <span className="on-dark">
          <button type="button" className="btn btn-secondary" onClick={runGrade} disabled={busy}>
            採点する
          </button>
        </span>
        <SubmitButton control={{ ...submit, submitting: submit.submitting || running === "grade" }} onClick={handleSubmit} />
      </PaneHeader>
      <StageBanner control={submit} dark />

      <div className="flex h-9 shrink-0 items-end gap-px bg-tile-1 px-2">
        <span className="rounded-t-sm bg-tile-3 px-4 py-2 font-mono text-[12px] text-white/85">Main.java</span>
      </div>

      <MonacoJavaEditor value={code} onChange={update} />

      {/* コンソール（たためる） */}
      <div
        className={`flex shrink-0 flex-col border-t border-white/10 bg-tile-1 text-white ${
          consoleOpen ? "h-[42%] min-h-[170px]" : ""
        }`}
      >
        <div className={`flex flex-wrap items-center justify-between gap-2 px-3 ${consoleOpen ? "pt-2" : "py-1.5"}`}>
          <div className="flex gap-1" role="tablist">
            {(
              [
                ["output", "出力"],
                ["tests", results ? `テスト結果 ${passed}/${results.length}` : "テスト結果"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => {
                  setTab(key);
                  setConsoleOpen(true);
                }}
                className={`btn rounded-full px-3 py-1 type-caption ${tab === key ? "bg-white/15 text-white" : "text-white/55"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {consoleOpen && tab === "output" && (
              <>
                <label className="flex items-center gap-2 type-fine text-white/55">
                  引数
                  <input
                    value={argsText}
                    onChange={(e) => setArgsText(e.target.value)}
                    placeholder="スペース区切り"
                    className="h-7 w-28 rounded-full border border-white/15 bg-tile-3 px-3 font-mono text-[12px] text-white outline-none placeholder:text-white/25 focus:border-primary-on-dark"
                  />
                </label>
                <button
                  type="button"
                  className={`btn rounded-full px-3 py-1 type-fine ${stdinOpen || stdin ? "bg-white/15 text-white" : "text-white/55"}`}
                  onClick={() => setStdinOpen((o) => !o)}
                  aria-expanded={stdinOpen}
                >
                  標準入力{stdin && !stdinOpen ? "あり" : ""}
                </button>
              </>
            )}
            <button
              type="button"
              className="btn rounded-full px-3 py-1 type-fine text-white/55"
              onClick={() => setConsoleOpen((o) => !o)}
              aria-expanded={consoleOpen}
            >
              {consoleOpen ? "▼ たたむ" : "▲ 開く"}
            </button>
          </div>
        </div>

        {consoleOpen && tab === "output" && stdinOpen && (
          <div className="px-3 pt-2">
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              rows={3}
              placeholder="Scanner などで読み込む入力（1 行ずつ）"
              aria-label="標準入力"
              className="w-full resize-y rounded-sm border border-white/15 bg-tile-3 px-3 py-2 font-mono text-[12px] text-white outline-none placeholder:text-white/25 focus:border-primary-on-dark"
            />
          </div>
        )}

        <div
          className={`min-h-0 flex-1 overflow-auto px-4 py-3 font-mono text-[12.5px] leading-[1.7] ${consoleOpen ? "" : "hidden"}`}
          role="tabpanel"
        >
          {running ? (
            <p className="flex items-center gap-2 text-white/55">
              <span className="size-3 animate-spin rounded-full border-2 border-white/20 border-t-primary-on-dark" />
              {running === "grade" ? "テストケースで実行しています…" : "コンパイルして実行しています…"}
            </p>
          ) : error ? (
            <p className="font-sans type-caption text-[#ff6961]">{error}</p>
          ) : tab === "output" ? (
            output ? (
              <RunView output={output} />
            ) : (
              <p className="font-sans type-caption text-white/45">「実行」を押すと、コンパイルして実行し、ここに出力を表示します。</p>
            )
          ) : grade ? (
            grade.compile.ok ? (
              <GradeView results={grade.results} />
            ) : (
              <CompileError output={grade.compile.output} />
            )
          ) : (
            <p className="font-sans type-caption text-white/45">「採点する」を押すと、テストケースで実行して自動採点します。</p>
          )}
        </div>
      </div>
    </>
  );
}

function CompileError({ output }: { output: string }) {
  return (
    <>
      <p className="font-sans type-caption-strong text-[#ff6961]">コンパイルエラー</p>
      <pre className="mt-1 whitespace-pre-wrap text-[#ff6961]">{output.trim()}</pre>
    </>
  );
}

function RunView({ output }: { output: RunOutput }) {
  const { args, compile, result } = output;
  return (
    <>
      <p className="text-white/40">
        $ javac Main.java && java Main {args.join(" ")}
      </p>
      {!compile.ok ? (
        <CompileError output={compile.output} />
      ) : result ? (
        <>
          {result.stdout ? (
            <pre className="whitespace-pre-wrap">{result.stdout}</pre>
          ) : (
            !result.stderr && <p className="text-white/40">（出力なし）</p>
          )}
          {result.stderr && <pre className="whitespace-pre-wrap text-[#ff6961]">{result.stderr}</pre>}
          <p className="mt-2 font-sans type-fine text-white/35">
            {result.timedOut
              ? "時間内（5 秒）に終わらなかったため止めました。無限ループになっていないか確認しましょう。"
              : result.exitCode !== 0
                ? `異常終了しました（終了コード ${result.exitCode}）`
                : `正常終了（${result.durationMs} ms）`}
            {result.truncated && " 出力が多すぎるため、途中で打ち切りました。"}
          </p>
        </>
      ) : null}
    </>
  );
}

function GradeView({ results }: { results: GradeCaseResult[] }) {
  return (
    <ul className="space-y-2 font-sans">
      {results.map((r, i) => (
        <li key={i} className="flex items-start gap-3 type-caption">
          <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${r.ok ? "bg-success" : "bg-danger"}`}>
            {r.ok ? <CheckIcon size={12} strokeWidth={3} /> : <XIcon size={12} strokeWidth={3} />}
          </span>
          <span className="text-white/85">
            {r.label && <span className="mr-2 rounded-full bg-white/10 px-2 py-0.5 type-fine">{r.label}</span>}
            {r.hidden ? (
              <span className="text-white/55">非公開のテストケース</span>
            ) : (
              <>
                入力 <span className="font-mono">{r.input || "（なし）"}</span> → 期待「{r.expected}」
              </>
            )}
            {!r.ok && !r.hidden && (
              <span className="block text-white/55">
                {r.error ?? <>実際の出力: {r.actual ? `「${r.actual}」` : "（出力なし）"}</>}
              </span>
            )}
            {!r.ok && r.hidden && r.error && <span className="block text-white/55">{r.error}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
