import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import { acquire, javaCommand, killContainer, prepare, release, type CompileResult, type SourceFile } from "./sandbox.js";

/*
 * 対話型の実行（オセロや自動販売機など、人が 1 行入力するとプログラムが応答する、を繰り返すもの）。
 * コンパイルしたコンテナと java のプロセスを、セッションとしてしばらく残しておく。
 * API は「1 行送る → 次の入力待ちになるまでの出力を受け取る」を繰り返す（WebSocket は使わない）。
 */

/** 同時に残しておけるセッションの数（それ以上は断る） */
const MAX_SESSIONS = Number(process.env.RUNNER_MAX_SESSIONS ?? 8);
/** 1 つのセッションが動いていられる時間 */
const LIFETIME_SEC = 15 * 60;
/** 入力がないまま、この時間が過ぎたら止める */
const IDLE_MS = 3 * 60_000;
/** 1 セッションで出せる出力の合計（無限ループで出し続けるプログラムを止める） */
const MAX_TOTAL_BYTES = 1024 * 1024;
/** 1 回に返す出力の上限 */
const MAX_READ_BYTES = 64 * 1024;
/** 出力が止まってから「入力待ちになった」とみなすまでの時間 */
const QUIET_MS = 150;
/** 出力が出始めるのを待つ最長の時間（重い計算の途中なら、続きは次の読み取りで返す） */
const FIRST_OUTPUT_MS = 2500;

type Session = {
  containerId: string;
  child: ChildProcessWithoutNullStreams;
  /** まだ返していない出力（標準出力と標準エラーを、届いた順に） */
  unread: string;
  totalBytes: number;
  truncated: boolean;
  exited: boolean;
  exitCode: number | null;
  lastDataAt: number;
  lastActiveAt: number;
  startedAt: number;
};

export type SessionOutput = {
  output: string;
  /** プログラムが終わった（このあとは入力を送れない） */
  exited: boolean;
  exitCode: number | null;
  /** 出力が多すぎて止めた、または時間切れで止めた */
  stopped: "output" | "time" | null;
};

export class SessionLimitError extends Error {}

const sessions = new Map<string, Session>();

export function sessionCount() {
  return sessions.size;
}

/** コンパイルして、プログラムを起動する。コンパイルに失敗したら sessionId は返さない */
export async function startSession(
  code: string,
  files: SourceFile[],
): Promise<{ compile: CompileResult; sessionId: string | null; first: SessionOutput | null }> {
  if (sessions.size >= MAX_SESSIONS) throw new SessionLimitError("対話の実行が混み合っています");
  await acquire();
  let containerId: string;
  let compile: CompileResult;
  try {
    ({ containerId, compile } = await prepare(code, files, LIFETIME_SEC + 30));
  } finally {
    release();
  }
  if (!compile.ok) {
    await killContainer(containerId);
    return { compile, sessionId: null, first: null };
  }

  const child = spawn("docker", javaCommand(containerId, LIFETIME_SEC, []), { stdio: ["pipe", "pipe", "pipe"] });
  const now = Date.now();
  const session: Session = {
    containerId,
    child,
    unread: "",
    totalBytes: 0,
    truncated: false,
    exited: false,
    exitCode: null,
    lastDataAt: now,
    lastActiveAt: now,
    startedAt: now,
  };
  const onData = (chunk: Buffer) => {
    if (session.truncated) return;
    session.totalBytes += chunk.length;
    if (session.totalBytes > MAX_TOTAL_BYTES) {
      session.truncated = true;
      session.unread += "\n（出力が多すぎるため止めました。無限ループになっていないか確認しましょう）\n";
      child.kill("SIGKILL");
      void killContainer(containerId);
      return;
    }
    session.unread += chunk.toString("utf8");
    session.lastDataAt = Date.now();
  };
  child.stdout.on("data", onData);
  child.stderr.on("data", onData);
  child.stdin.on("error", () => {}); // 終わったプログラムへの書き込みエラーは無視する
  child.on("close", (exitCode) => {
    session.exited = true;
    session.exitCode = exitCode;
    session.lastDataAt = Date.now();
  });
  child.on("error", () => {
    session.exited = true;
  });

  const id = randomUUID();
  sessions.set(id, session);
  return { compile, sessionId: id, first: await collect(session) };
}

/** 1 行送って、次の入力待ちになるまでの出力を返す。セッションがなければ null */
export async function sendLine(id: string, line: string): Promise<SessionOutput | null> {
  const session = sessions.get(id);
  if (!session) return null;
  session.lastActiveAt = Date.now();
  if (!session.exited) {
    session.lastDataAt = Date.now();
    session.child.stdin.write(`${line}\n`);
  }
  return collect(session);
}

/** 入力は送らず、続きの出力を読む（重い計算の途中だったときなど） */
export async function readMore(id: string): Promise<SessionOutput | null> {
  const session = sessions.get(id);
  if (!session) return null;
  session.lastActiveAt = Date.now();
  return collect(session);
}

export async function stopSession(id: string) {
  const session = sessions.get(id);
  if (!session) return false;
  sessions.delete(id);
  session.child.kill("SIGKILL");
  await killContainer(session.containerId);
  return true;
}

/** 出力が止まる（入力待ちになる）か、プログラムが終わるまで待ってから、たまった出力を返す */
async function collect(session: Session): Promise<SessionOutput> {
  const start = Date.now();
  const startBytes = session.totalBytes;
  for (;;) {
    const now = Date.now();
    const gotSome = session.totalBytes > startBytes || session.unread.length > 0;
    if (session.exited) break;
    if (gotSome && now - session.lastDataAt >= QUIET_MS) break;
    if (now - start >= FIRST_OUTPUT_MS) break;
    await new Promise((r) => setTimeout(r, 30));
  }
  let output = session.unread;
  if (output.length > MAX_READ_BYTES) {
    // 残りは次の読み取りで返す
    session.unread = output.slice(MAX_READ_BYTES);
    output = output.slice(0, MAX_READ_BYTES);
  } else {
    session.unread = "";
  }
  const timedOut = session.exited && (session.exitCode === 124 || session.exitCode === 137) && !session.truncated;
  return {
    output,
    exited: session.exited && session.unread.length === 0,
    exitCode: session.exitCode,
    stopped: session.truncated ? "output" : timedOut ? "time" : null,
  };
}

// 放置されたセッション・時間切れのセッションを片付ける
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    const idle = now - s.lastActiveAt > IDLE_MS;
    const old = now - s.startedAt > (LIFETIME_SEC + 30) * 1000;
    if (idle || old) void stopSession(id);
  }
}, 15_000).unref();
