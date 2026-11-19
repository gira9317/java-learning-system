import {
  readRunnerOutput,
  sendRunnerInput,
  startRunnerSession,
  stopRunnerSession,
  type SessionOutput,
  type SourceFile,
} from "./runner.js";

/*
 * 対話型の実行のセッションと、その持ち主（受講者）の対応。
 * 1 人が同時に動かせるのは 1 つだけ（新しく始めたら前のものは止める）。
 * 実行サーバーの再起動などでセッションが消えたら、ここからも忘れる（API の再起動でも消える）。
 */

const owners = new Map<string, string>(); // sessionId → userId
const byUser = new Map<string, string>(); // userId → sessionId

function forget(sessionId: string) {
  const userId = owners.get(sessionId);
  owners.delete(sessionId);
  if (userId && byUser.get(userId) === sessionId) byUser.delete(userId);
}

export async function openSession(userId: string, code: string, files: SourceFile[]) {
  const previous = byUser.get(userId);
  if (previous) {
    forget(previous);
    await stopRunnerSession(previous);
  }
  const started = await startRunnerSession(code, files);
  if (started.sessionId) {
    owners.set(started.sessionId, userId);
    byUser.set(userId, started.sessionId);
  }
  return started;
}

export function ownsSession(userId: string, sessionId: string) {
  return owners.get(sessionId) === userId;
}

/** 終わったプログラムのセッションは、すぐに片付ける */
async function settle(sessionId: string, out: SessionOutput | null) {
  if (!out || out.exited) {
    forget(sessionId);
    if (out) await stopRunnerSession(sessionId);
  }
  return out;
}

export async function sendInput(sessionId: string, line: string) {
  return settle(sessionId, await sendRunnerInput(sessionId, line));
}

export async function readOutput(sessionId: string) {
  return settle(sessionId, await readRunnerOutput(sessionId));
}

export async function closeSession(sessionId: string) {
  forget(sessionId);
  await stopRunnerSession(sessionId);
}
