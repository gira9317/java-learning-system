"use client";

import { useState } from "react";
import { CheckIcon, CodeIcon, PlayIcon, ResetIcon, XIcon } from "@/components/icons";
import { MonacoJavaEditor } from "./monaco-java-editor";
import type { CodeContent } from "@/api/submissions-api";
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

export type TestResult = { input: string; expected: string; actual: string; ok: boolean };

const testCases = [
  { input: "80", expected: "合格" },
  { input: "60", expected: "合格" },
  { input: "59", expected: "不合格" },
];

/*
 * 実行・採点のモック。本番では隔離された Runner / 外部実行 API にコードを送る。
 * ここでは if (score OP N) { ... } else { ... } の形だけを解釈して出力を推定する。
 */
function simulate(code: string, arg: string): { stdout: string; error?: string } {
  const open = (code.match(/\{/g) ?? []).length;
  const close = (code.match(/\}/g) ?? []).length;
  if (open !== close) return { stdout: "", error: "Main.java: エラー: 構文解析中にファイルの終わりに移りました（{ と } の数が一致しません）" };
  if (!/class\s+Main/.test(code)) return { stdout: "", error: "エラー: クラス Main が見つかりません" };

  const prints = (block: string) => [...block.matchAll(/System\.out\.println\(\s*"([^"]*)"\s*\)/g)].map((m) => m[1]);
  const m = code.match(/if\s*\(\s*score\s*(>=|>|<=|<|==)\s*(\d+)\s*\)\s*\{([\s\S]*?)\}(\s*else\s*\{([\s\S]*?)\})?/);
  if (!m) return { stdout: prints(code).join("\n") };

  const score = Number(arg);
  if (Number.isNaN(score)) return { stdout: "", error: `Exception in thread "main" java.lang.NumberFormatException: For input string: "${arg}"` };
  const n = Number(m[2]);
  const cond = { ">=": score >= n, ">": score > n, "<=": score <= n, "<": score < n, "==": score === n }[m[1]]!;
  return { stdout: (cond ? prints(m[3]) : prints(m[5] ?? "")).join("\n") };
}

function runTests(code: string): TestResult[] {
  return testCases.map((t) => {
    const res = simulate(code, t.input);
    const actual = res.error ? "エラー" : res.stdout;
    return { ...t, actual, ok: !res.error && actual.trim() === t.expected };
  });
}

export function CodePane({
  onGraded,
  initial,
  submit,
  onSubmit,
  saveDraft,
}: {
  onGraded: (results: TestResult[] | null) => void;
  /** 開いたときの内容（下書き、なければ最後に提出したコード） */
  initial?: CodeContent;
  submit: SubmitControl;
  onSubmit: (content: CodeContent, results: TestResult[]) => void;
  /** 下書きの保存（手を止めたときと、ページを離れるときに自動で呼ぶ） */
  saveDraft: (content: CodeContent, options: { keepalive: boolean }) => Promise<unknown>;
}) {
  const [code, setCode] = useState(initial?.code ?? starterCode);
  const draftStatus = useAutosave<CodeContent>({ code }, saveDraft);
  const [arg, setArg] = useState("80");
  const [tab, setTab] = useState<"output" | "tests">("output");
  // コンソールは普段たたんでおき、エディタを広く使う。実行・採点・提出したときに開く
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<{ stdout: string; error?: string } | null>(null);
  const [results, setResults] = useState<TestResult[] | null>(null);

  function update(next: string) {
    setCode(next);
    if (results) {
      setResults(null);
      onGraded(null);
    }
  }

  function run() {
    setTab("output");
    setConsoleOpen(true);
    setRunning(true);
    setOutput(null);
    setTimeout(() => {
      setOutput(simulate(code, arg));
      setRunning(false);
    }, 600);
  }

  function grade() {
    setTab("tests");
    setConsoleOpen(true);
    setRunning(true);
    setTimeout(() => {
      const r = runTests(code);
      setResults(r);
      onGraded(r);
      setRunning(false);
    }, 800);
  }

  // 提出の前に採点し、その結果も一緒に送る（研修担当者が参考にする）
  function handleSubmit() {
    const r = runTests(code);
    setTab("tests");
    setConsoleOpen(true);
    setResults(r);
    onGraded(r);
    onSubmit({ code }, r);
  }

  const passed = results?.filter((r) => r.ok).length ?? 0;

  return (
    <>
      <PaneHeader icon={<CodeIcon size={16} />} title="Javaコード" dark>
        <span className="hidden type-fine text-white/45 md:inline" role="status">
          {autosaveLabel(draftStatus)}
        </span>
        <button
          type="button"
          className="btn type-caption text-white/60"
          onClick={() => update(starterCode)}
          aria-label="コードを初期状態に戻す"
        >
          <ResetIcon size={14} />
          <span className="hidden sm:inline">リセット</span>
        </button>
        <span className="on-dark">
          <button type="button" className="btn btn-secondary" onClick={run} disabled={running}>
            <PlayIcon size={12} />
            実行
          </button>
        </span>
        <span className="on-dark">
          <button type="button" className="btn btn-secondary" onClick={grade} disabled={running}>
            採点する
          </button>
        </span>
        <SubmitButton control={submit} onClick={handleSubmit} />
      </PaneHeader>
      <StageBanner control={submit} dark />

      <div className="flex h-9 shrink-0 items-end gap-px bg-tile-1 px-2">
        <span className="rounded-t-sm bg-tile-3 px-4 py-2 font-mono text-[12px] text-white/85">Main.java</span>
      </div>

      <MonacoJavaEditor value={code} onChange={update} />

      {/* コンソール（たためる） */}
      <div
        className={`flex shrink-0 flex-col border-t border-white/10 bg-tile-1 text-white ${
          consoleOpen ? "h-[38%] min-h-[150px]" : ""
        }`}
      >
        <div className={`flex items-center justify-between gap-3 px-3 ${consoleOpen ? "pt-2" : "py-1.5"}`}>
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
              <label className="flex items-center gap-2 type-fine text-white/55">
                引数
                <input
                  value={arg}
                  onChange={(e) => setArg(e.target.value)}
                  className="h-7 w-16 rounded-full border border-white/15 bg-tile-3 px-3 font-mono text-[12px] text-white outline-none focus:border-primary-on-dark"
                />
              </label>
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

        <div className={`min-h-0 flex-1 overflow-auto px-4 py-3 font-mono text-[12.5px] leading-[1.7] ${consoleOpen ? "" : "hidden"}`} role="tabpanel">
          {running ? (
            <p className="flex items-center gap-2 text-white/55">
              <span className="size-3 animate-spin rounded-full border-2 border-white/20 border-t-primary-on-dark" />
              {tab === "tests" ? "テストケースを実行しています…" : "コンパイルして実行しています…"}
            </p>
          ) : tab === "output" ? (
            output ? (
              <>
                <p className="text-white/40">$ java Main {arg}</p>
                {output.error ? (
                  <p className="whitespace-pre-wrap text-[#ff6961]">{output.error}</p>
                ) : (
                  <p className="whitespace-pre-wrap">{output.stdout || <span className="text-white/40">（出力なし）</span>}</p>
                )}
                <p className="mt-2 font-sans type-fine text-white/30">※ 実行環境に接続するまでの簡易シミュレーションです</p>
              </>
            ) : (
              <p className="font-sans type-caption text-white/45">「実行」を押すと、ここに標準出力が表示されます。</p>
            )
          ) : results ? (
            <ul className="space-y-2 font-sans">
              {results.map((r) => (
                <li key={r.input} className="flex items-start gap-3 type-caption">
                  <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${r.ok ? "bg-success" : "bg-danger"}`}>
                    {r.ok ? <CheckIcon size={12} strokeWidth={3} /> : <XIcon size={12} strokeWidth={3} />}
                  </span>
                  <span className="text-white/85">
                    入力 <span className="font-mono">{r.input}</span> → 期待 「{r.expected}」
                    {!r.ok && (
                      <span className="block text-white/55">
                        実際の出力: {r.actual ? `「${r.actual}」` : "（出力なし）"}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-sans type-caption text-white/45">「採点する」を押すと、テストケースでコードを自動採点します。</p>
          )}
        </div>
      </div>
    </>
  );
}
