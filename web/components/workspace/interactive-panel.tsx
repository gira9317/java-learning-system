"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/api/client";
import {
  readSessionOutput,
  sendSessionInput,
  startSession,
  stopSession,
  type CodeContent,
  type CompileResult,
  type SessionOutput,
} from "@/api/submissions-api";
import { PlayIcon } from "@/components/icons";
import { countStones, lastBoard } from "@/lib/othello-board";

type Entry = { kind: "out" | "in" | "info"; text: string };
type Status = "idle" | "starting" | "running" | "waiting" | "exited";

function errorMessage(e: unknown) {
  return e instanceof ApiError ? e.message : "実行環境に接続できませんでした。";
}

/**
 * 対話型の実行。人が 1 行入力 → プログラムが応答、を繰り返す（実行サーバーがプログラムを動かし続ける）。
 * othello では、出力に出てきた最後の盤面をクリックできる盤として表示し、押したマスを「行 列」で送る。
 */
export function InteractivePanel({
  lessonId,
  questionNo,
  content,
  variant,
}: {
  lessonId: number;
  questionNo: number;
  /** いまエディタにあるコード（「対話で実行」を押した時点のものを動かす） */
  content: CodeContent;
  variant: "console" | "othello";
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [compileError, setCompileError] = useState<CompileResult | null>(null);
  const [line, setLine] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [startedWith, setStartedWith] = useState<string | null>(null);
  // 応答を待っている間は、続けて送れないようにする
  const [busy, setBusy] = useState(false);
  const sessionRef = useRef<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const codeKey = JSON.stringify(content);
  const stale = status !== "idle" && startedWith !== null && startedWith !== codeKey;
  const live = status === "running" || status === "waiting";

  // 画面を離れたら、動かしているプログラムを止める
  useEffect(() => {
    return () => {
      const id = sessionRef.current;
      if (id) void stopSession(lessonId, id, questionNo, { keepalive: true }).catch(() => {});
    };
  }, [lessonId, questionNo]);

  // 新しい出力が出たら、いちばん下まで送る
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [entries]);

  function append(next: Entry[]) {
    setEntries((es) => {
      const merged = [...es];
      for (const e of next) {
        const last = merged[merged.length - 1];
        // 出力は続けて届くことがあるので、1 つにまとめる
        if (e.kind === "out" && last?.kind === "out") merged[merged.length - 1] = { kind: "out", text: last.text + e.text };
        else if (e.text) merged.push(e);
      }
      return merged.slice(-500);
    });
  }

  function receive(out: SessionOutput) {
    const notes: Entry[] = [{ kind: "out", text: out.output }];
    if (out.exited) {
      sessionRef.current = null;
      setStatus("exited");
      notes.push({
        kind: "info",
        text:
          out.stopped === "output"
            ? "出力が多すぎるため止めました。"
            : out.stopped === "time"
              ? "時間切れのため止めました。"
              : out.exitCode === 0
                ? "プログラムが終了しました。"
                : `プログラムが異常終了しました（終了コード ${out.exitCode}）。`,
      });
    } else {
      setStatus(out.output ? "running" : "waiting");
    }
    append(notes);
  }

  async function start() {
    const previous = sessionRef.current;
    sessionRef.current = null;
    if (previous) void stopSession(lessonId, previous, questionNo).catch(() => {});
    setStatus("starting");
    setEntries([]);
    setCompileError(null);
    setError(null);
    setStartedWith(codeKey);
    try {
      const r = await startSession(lessonId, content, questionNo);
      if (!r.compile.ok || !r.sessionId || !r.first) {
        setCompileError(r.compile);
        setStatus("idle");
        return;
      }
      sessionRef.current = r.sessionId;
      receive(r.first);
      inputRef.current?.focus();
    } catch (e) {
      setError(errorMessage(e));
      setStatus("idle");
    }
  }

  async function send(text: string) {
    const id = sessionRef.current;
    if (!id || !live) return;
    append([{ kind: "in", text }]);
    setBusy(true);
    setError(null);
    try {
      receive(await sendSessionInput(lessonId, id, text, questionNo));
    } catch (e) {
      setError(errorMessage(e));
      sessionRef.current = null;
      setStatus("exited");
    } finally {
      setBusy(false);
    }
  }

  async function readMore() {
    const id = sessionRef.current;
    if (!id) return;
    setBusy(true);
    try {
      receive(await readSessionOutput(lessonId, id, questionNo));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    const id = sessionRef.current;
    sessionRef.current = null;
    if (id) await stopSession(lessonId, id, questionNo).catch(() => {});
    append([{ kind: "info", text: "止めました。" }]);
    setStatus("exited");
  }

  const transcript = entries.filter((e) => e.kind === "out").map((e) => e.text).join("");
  const board = variant === "othello" ? lastBoard(transcript) : null;
  const stones = board ? countStones(board) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 font-sans">
      <div className="flex flex-wrap items-center gap-2">
        <span className="on-dark">
          <button type="button" className="btn btn-secondary" onClick={start} disabled={status === "starting"}>
            <PlayIcon size={12} />
            {status === "idle" ? "対話で実行" : "最初から実行し直す"}
          </button>
        </span>
        {live && (
          <button type="button" className="btn rounded-full px-3 py-1 type-fine text-white/70 hover:bg-white/10" onClick={stop}>
            ■ 止める
          </button>
        )}
        <span className="type-fine text-white/45" role="status">
          {status === "starting"
            ? "コンパイルして起動しています…"
            : busy
              ? "応答を待っています…"
              : status === "waiting"
                ? "まだ出力がありません（計算中かもしれません）"
              : status === "running"
                ? variant === "othello"
                  ? "盤面のマスを押すか、下の欄に「行 列」を入力します"
                  : "下の欄に入力して Enter で送ります"
                : status === "exited"
                  ? "終了しました"
                  : "コードをコンパイルして起動し、入力しながら動かします"}
        </span>
      </div>
      {stale && (
        <p className="type-fine text-[#ffd479]">コードを変更しました。「最初から実行し直す」で、変更後のコードが動きます。</p>
      )}
      {error && <p className="type-caption text-[#ff6961]">{error}</p>}
      {compileError && (
        <div>
          <p className="type-caption-strong text-[#ff6961]">コンパイルエラー</p>
          <pre className="mt-1 whitespace-pre-wrap font-mono text-[12.5px] text-[#ff6961]">{compileError.output.trim()}</pre>
        </div>
      )}

      <div className={`flex min-h-0 flex-1 gap-3 ${variant === "othello" ? "flex-col sm:flex-row" : "flex-col"}`}>
        {variant === "othello" && (
          <div className="shrink-0">
            {board ? (
              <>
                <div
                  className="grid w-max grid-cols-8 gap-px rounded-sm bg-[#0b3d1f] p-px"
                  role="grid"
                  aria-label="オセロの盤面"
                >
                  {board.map((row, r) =>
                    row.map((cell, c) => (
                      <button
                        key={`${r}-${c}`}
                        type="button"
                        role="gridcell"
                        aria-label={`${r + 1}行${c + 1}列 ${cell === "B" ? "黒" : cell === "W" ? "白" : "空き"}`}
                        disabled={!live || busy || cell !== "."}
                        onClick={() => send(`${r + 1} ${c + 1}`)}
                        className="grid size-8 place-items-center bg-[#1f7a3d] enabled:hover:bg-[#2a9150] sm:size-9"
                      >
                        {cell !== "." && (
                          <span className={`block size-6 rounded-full sm:size-7 ${cell === "B" ? "bg-[#111]" : "bg-[#f5f5f5]"} shadow-[0_1px_2px_rgba(0,0,0,0.5)]`} />
                        )}
                      </button>
                    )),
                  )}
                </div>
                {stones && (
                  <p className="mt-1 type-fine text-white/55">
                    ● 黒 {stones.black}　○ 白 {stones.white}
                  </p>
                )}
              </>
            ) : (
              <p className="w-64 type-fine text-white/45">
                プログラムが盤面を表示すると、ここに盤が出ます（形式は第1問と同じ。1 行目が「  1 2 3 4 5 6 7 8」）。
              </p>
            )}
          </div>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div ref={logRef} className="min-h-0 flex-1 overflow-auto rounded-sm bg-tile-3 px-3 py-2 font-mono text-[12.5px] leading-[1.6]">
            {entries.length === 0 ? (
              <p className="font-sans type-fine text-white/35">ここにプログラムの出力と、入力した内容が順に表示されます。</p>
            ) : (
              entries.map((e, i) => (
                <pre
                  key={i}
                  className={`whitespace-pre-wrap ${e.kind === "in" ? "text-primary-on-dark" : e.kind === "info" ? "font-sans type-fine text-white/45" : "text-white/85"}`}
                >
                  {e.kind === "in" ? `> ${e.text}` : e.text}
                </pre>
              ))
            )}
          </div>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!live || busy) return;
              void send(line);
              setLine("");
            }}
          >
            <input
              ref={inputRef}
              value={line}
              onChange={(e) => setLine(e.target.value)}
              disabled={!live}
              placeholder={live ? (variant === "othello" ? "例: 3 4（行 列）" : "入力して Enter") : "「対話で実行」を押すと入力できます"}
              aria-label="プログラムへの入力"
              className="h-8 min-w-0 flex-1 rounded-full border border-white/15 bg-tile-3 px-3 font-mono text-[12.5px] text-white outline-none placeholder:text-white/25 focus:border-primary-on-dark disabled:opacity-50"
            />
            <button type="submit" className="btn rounded-full px-3 py-1 type-fine text-white/70 hover:bg-white/10" disabled={!live || busy}>
              送る
            </button>
            {status === "waiting" && !busy && (
              <button type="button" className="btn rounded-full px-3 py-1 type-fine text-white/55 hover:bg-white/10" onClick={readMore}>
                続きを読む
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
