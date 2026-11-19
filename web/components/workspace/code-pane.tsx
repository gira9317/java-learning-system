"use client";

import { useRef, useState } from "react";
import { ApiError } from "@/api/client";
import {
  getLessonSubmissions,
  gradeCode,
  runCode,
  type CodeContent,
  type CodeFile,
  type CompileResult,
  type GradeCaseResult,
  type RunCaseResult,
} from "@/api/submissions-api";
import { CheckIcon, CodeIcon, PlayIcon, ResetIcon, XIcon } from "@/components/icons";
import {
  MAIN_FILE,
  allFolders,
  newFileTemplate,
  retarget,
  sortSources,
  toContent,
  toSources,
  type Source,
} from "@/lib/code-files";
import { FileExplorer } from "./file-explorer";
import { InteractivePanel } from "./interactive-panel";
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
type GradeOutput = { code: string; compile: CompileResult; results: GradeCaseResult[] };

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
  multiFile = false,
  starterFiles,
  mode = "graded",
  interactive,
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
  /** フォルダ（package）とファイルを作れるようにする（クラス以降のレッスン） */
  multiFile?: boolean;
  /** 最初から用意しておく Main.java 以外のファイル */
  starterFiles?: CodeFile[];
  /** graded = 全テスト合格で提出できる。open = 自由制作（コンパイルが通れば提出でき、評価はレビュー） */
  mode?: "graded" | "open";
  /** 対話で動かす問題なら、コンソールに「対話」タブを出す */
  interactive?: "console" | "othello";
}) {
  const starterContent: CodeContent = starterFiles?.length ? { code: starter, files: starterFiles } : { code: starter };
  // Main.java も含めた全ファイル。採点・提出・下書きでは { code, files } の形に戻す
  const [sources, setSources] = useState<Source[]>(() => toSources(initial ?? starterContent));
  const [extraFolders, setExtraFolders] = useState<string[]>([]);
  const [activePath, setActivePath] = useState(MAIN_FILE);
  const content = toContent(sources);
  const code = JSON.stringify(content);
  const currentCode = useRef(code);
  const draftStatus = useAutosave<CodeContent>(content, saveDraft);
  const active = sources.find((s) => s.path === activePath) ?? sources[0];
  const folders = allFolders(sources, extraFolders);
  const [argsText, setArgsText] = useState(initialArgs.join(" "));
  const [stdin, setStdin] = useState("");
  const [stdinOpen, setStdinOpen] = useState(false);
  const [tab, setTab] = useState<"output" | "tests" | "interactive">(interactive ? "interactive" : "output");
  // コンソールは普段たたんでおき、エディタを広く使う。実行・採点・提出したときに開く
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [running, setRunning] = useState<"run" | "grade" | null>(null);
  const [output, setOutput] = useState<RunOutput | null>(null);
  const [grade, setGrade] = useState<GradeOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentGrade = grade?.code === code ? grade : null;
  const results = currentGrade?.compile.ok ? currentGrade.results : null;

  /** ファイルの一覧を変える。中身が変われば採点結果は古くなる */
  function replaceSources(next: Source[]) {
    const sorted = sortSources(next);
    currentCode.current = JSON.stringify(toContent(sorted));
    setSources(sorted);
    if (grade) {
      setGrade(null);
      onGraded(null);
    }
  }

  /** エディタで開いているファイルの中身が変わった */
  function update(next: string) {
    replaceSources(sources.map((s) => (s.path === active.path ? { ...s, content: next } : s)));
  }

  function createFile(path: string) {
    replaceSources([...sources, { path, content: newFileTemplate(path) }]);
    setActivePath(path);
  }

  function renameFile(from: string, to: string) {
    replaceSources(sources.map((s) => (s.path === from ? { path: to, content: retarget(s.content, from, to) } : s)));
    if (activePath === from) setActivePath(to);
  }

  function remove(target: { kind: "file" | "folder"; path: string }) {
    const inside = (p: string) => (target.kind === "file" ? p === target.path : p.startsWith(`${target.path}/`));
    const doomed = sources.filter((s) => inside(s.path));
    const label = target.kind === "file" ? target.path : `${target.path}/ と中のファイル ${doomed.length} 個`;
    if (doomed.length > 0 && !window.confirm(`${label}を削除します。よろしいですか？`)) return;
    replaceSources(sources.filter((s) => !inside(s.path)));
    if (target.kind === "folder") setExtraFolders((fs) => fs.filter((f) => f !== target.path && !f.startsWith(`${target.path}/`)));
    if (inside(activePath)) setActivePath(MAIN_FILE);
  }

  /** 前の問題の下書き（なければ最後の提出）を読み込む。少しずつ育てていくレッスン（オセロなど）用 */
  async function loadPrevious() {
    const previous = questionNo - 1;
    try {
      const s = await getLessonSubmissions(lessonId, { questionNo: previous });
      const loaded = s.drafts.code?.content ?? (s.latest.code?.content as CodeContent | undefined);
      if (!loaded) {
        window.alert(`第${previous}問のコードがまだありません。`);
        return;
      }
      if (!window.confirm(`第${previous}問のコード（ファイル ${toSources(loaded).length} 個）で、今のファイルをすべて置き換えます。よろしいですか？`)) return;
      replaceSources(toSources(loaded));
      setExtraFolders([]);
      setActivePath(MAIN_FILE);
    } catch (e) {
      window.alert(errorMessage(e));
    }
  }

  async function run() {
    const args = parseArgs(argsText);
    setTab("output");
    setConsoleOpen(true);
    setRunning("run");
    setError(null);
    try {
      const r = await runCode(lessonId, { ...content, args, stdin }, questionNo);
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
    const gradedCode = code;
    const gradedContent = content;
    setTab("tests");
    setConsoleOpen(true);
    setRunning("grade");
    setError(null);
    try {
      const g = await gradeCode(lessonId, gradedContent, questionNo);
      if (currentCode.current !== gradedCode) return null;
      setGrade({ ...g, code: gradedCode });
      onGraded(g.compile.ok ? g.results : []);
      return g;
    } catch (e) {
      if (currentCode.current === gradedCode) {
        setGrade(null);
        onGraded(null);
        setError(errorMessage(e));
      }
      return null;
    } finally {
      setRunning(null);
    }
  }

  // 合格したコードだけを送る。API側でも同じコードを必ず採点し直す。
  function handleSubmit() {
    if (!submittable || busy || !submit.stage.canSubmit || !results) return;
    onSubmit(content, results);
  }

  /**
   * Ctrl+S / Ctrl+Enter（Mac は ⌘）で採点する。
   * 提出（＝研修担当者のレビューに回る）は、意図せず送らないよう「提出する」ボタンを押したときだけにする。
   * エディタ（Monaco）より先に受け取るため、キャプチャ段階で拾う。ブラウザの「ページを保存」も止める。
   */
  function onKeyDownCapture(e: React.KeyboardEvent) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
    if (e.key !== "s" && e.key !== "S" && e.key !== "Enter") return;
    if (e.nativeEvent.isComposing) return;
    e.preventDefault();
    e.stopPropagation();
    if (!busy) void runGrade();
  }

  const passed = results?.filter((r) => r.ok).length ?? 0;
  const busy = running !== null || submit.submitting;
  const allPassed = Boolean(results?.length && results.every((result) => result.ok));
  const open = mode === "open";
  const gradeLabel = open ? "確認する" : "採点する";
  // 自由制作はコンパイルが通れば提出できる（テストは動作の目安）
  const submittable = open ? Boolean(results) : allPassed;
  const validationReason = !currentGrade
    ? open
      ? "先に「確認する」でコンパイルが通るか確かめてください。コードを変更した場合はもう一度確認します。"
      : "先に「採点する」で全テストに合格してください。コードを変更した場合は再採点が必要です。"
    : !currentGrade.compile.ok
      ? open ? "コンパイルエラーを修正して、もう一度確認してください。" : "コンパイルエラーを修正して、再採点してください。"
      : !submittable ? "失敗したテストを修正し、全テストに合格してから提出してください。" : undefined;

  return (
    <div className="contents" onKeyDownCapture={onKeyDownCapture}>
      <PaneHeader icon={<CodeIcon size={16} />} title="Javaコード" dark>
        <span className="hidden type-fine text-white/45 md:inline" role="status">
          {autosaveLabel(draftStatus)}
        </span>
        <span className="on-dark">
          <button type="button" className="btn btn-secondary" onClick={run} disabled={busy}>
            <PlayIcon size={12} />
            実行
          </button>
        </span>
        <span className="on-dark" title={`${gradeLabel}（Ctrl+S / Ctrl+Enter）`}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={runGrade}
            disabled={busy}
            aria-keyshortcuts="Control+S Control+Enter Meta+S Meta+Enter"
          >
            {gradeLabel}
          </button>
        </span>
        <SubmitButton control={{ ...submit, validationReason: busy ? "実行・採点・提出が終わるまでお待ちください。" : validationReason }} onClick={handleSubmit} />
      </PaneHeader>
      <StageBanner control={submit} dark />
      {submit.stage.canSubmit && validationReason && (
        <p role="status" className="shrink-0 bg-tile-1 px-4 py-2 type-caption text-white/70">
          {validationReason}
          <span className="ml-2 text-white/45">Ctrl+S / Ctrl+Enter でも{open ? "確認" : "採点"}できます。</span>
        </p>
      )}

      <div className="flex min-h-0 flex-1">
        {multiFile && (
          <FileExplorer
            sources={sources}
            folders={folders}
            active={active.path}
            onOpen={setActivePath}
            onCreateFile={createFile}
            onCreateFolder={(path) => setExtraFolders((fs) => [...fs, path])}
            onRename={renameFile}
            onDelete={remove}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* リセットはファイルに対する操作なので、保存の表示や提出ボタンから離してファイルのタブの右に置く */}
          <div className="flex h-9 shrink-0 items-end justify-between gap-px bg-tile-1 px-2">
            <span className="truncate rounded-t-sm bg-tile-3 px-4 py-2 font-mono text-[12px] text-white/85">{active.path}</span>
            <span className="flex shrink-0 items-center gap-1">
            {multiFile && questionNo > 1 && (
              <button
                type="button"
                className="btn mb-1 shrink-0 rounded-full px-3 py-1 type-fine text-white/55 hover:bg-white/10 hover:text-white"
                onClick={loadPrevious}
                title={`第${questionNo - 1}問で書いたファイルを読み込んで、続きから作ります`}
              >
                第{questionNo - 1}問から読み込む
              </button>
            )}
            <button
              type="button"
              className="btn mb-1 shrink-0 rounded-full px-3 py-1 type-fine text-white/55 hover:bg-white/10 hover:text-white"
              onClick={() => {
                const message = multiFile
                  ? "すべてのファイルを初期状態に戻します。追加したファイルも消えます。よろしいですか？"
                  : "コードを初期状態に戻します。書いたコードは消えます。よろしいですか？";
                if (code !== JSON.stringify(starterContent) && !window.confirm(message)) return;
                replaceSources(toSources(starterContent));
                setExtraFolders([]);
                setActivePath(MAIN_FILE);
              }}
              aria-label="コードを初期状態に戻す"
            >
              <ResetIcon size={13} />
              リセット
            </button>
            </span>
          </div>

          <MonacoJavaEditor value={active.content} onChange={update} path={active.path} />
        </div>
      </div>

      {/* コンソール（たためる） */}
      <div
        className={`flex shrink-0 flex-col border-t border-white/10 bg-tile-1 text-white ${
          consoleOpen ? (tab === "interactive" && interactive === "othello" ? "h-[62%] min-h-[340px]" : "h-[42%] min-h-[170px]") : ""
        }`}
      >
        <div className={`flex flex-wrap items-center justify-between gap-2 px-3 ${consoleOpen ? "pt-2" : "py-1.5"}`}>
          <div className="flex gap-1" role="tablist">
            {(
              [
                ...(interactive ? ([["interactive", "対話"]] as const) : []),
                ["output", "出力"],
                ["tests", results ? `${open ? "確認結果" : "テスト結果"} ${passed}/${results.length}` : open ? "確認結果" : "テスト結果"],
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

        {/* 対話は、タブを切り替えても動かしているプログラムを止めないよう、隠すだけにする */}
        {interactive && (
          <div className={`min-h-0 flex-1 flex-col px-4 py-3 ${consoleOpen && tab === "interactive" ? "flex" : "hidden"}`} role="tabpanel">
            <InteractivePanel lessonId={lessonId} questionNo={questionNo} content={content} variant={interactive} />
          </div>
        )}

        <div
          className={`min-h-0 flex-1 overflow-auto px-4 py-3 font-mono text-[12.5px] leading-[1.7] ${consoleOpen && tab !== "interactive" ? "" : "hidden"}`}
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
          ) : currentGrade ? (
            currentGrade.compile.ok ? (
              <>
                {open && (
                  <p className="mb-2 font-sans type-caption text-[#8ee59e]">
                    コンパイルが通りました。提出できます。{currentGrade.results.length > 0 && "下の確認結果は動作の目安です（提出の条件ではありません）。"}
                  </p>
                )}
                <GradeView results={currentGrade.results} />
              </>
            ) : (
              <CompileError output={currentGrade.compile.output} />
            )
          ) : (
            <p className="font-sans type-caption text-white/45">
              {open ? "「確認する」を押すと、コンパイルが通るか（例があれば動作も）確かめます。" : "「採点する」を押すと、テストケースで実行して自動採点します。"}
            </p>
          )}
        </div>
      </div>
    </div>
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
