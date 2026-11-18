import { spawn } from "node:child_process";
import { EGG_ENV, eggSetup } from "./eggs.js";

// 受講者のコードを、使い捨ての JDK コンテナの中でコンパイル・実行する。
// 1 回のリクエストにつきコンテナを 1 つ起動し、コンパイルは 1 回、テストケースの数だけ実行して、最後に止める。

const IMAGE = process.env.RUNNER_IMAGE ?? "eclipse-temurin:21-jdk";
const CONCURRENCY = Number(process.env.RUNNER_CONCURRENCY ?? 4);

/** 1 回の実行の制限 */
const RUN_TIME_LIMIT_SEC = 5;
const COMPILE_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 64 * 1024;

/**
 * コンテナの隔離設定。
 * ネットワークなし・メモリ / CPU / プロセス数の上限・ファイルは一時領域だけ書ける・
 * 一般ユーザー（nobody）で実行・特権はすべて外す。
 */
const SANDBOX_ARGS = [
  "--network", "none",
  "--memory", "256m",
  "--memory-swap", "256m",
  "--cpus", "1",
  "--pids-limit", "64",
  "--read-only",
  "--tmpfs", "/work:rw,exec,size=16m,mode=1777",
  "--tmpfs", "/tmp:rw,exec,size=32m,mode=1777",
  "--user", "65534:65534",
  "--cap-drop", "ALL",
  "--security-opt", "no-new-privileges",
  "--workdir", "/work",
  // イースターエッグ（eggs.ts）のヒント
  ...Object.entries(EGG_ENV).flatMap(([k, v]) => ["--env", `${k}=${v}`]),
];

export type RunCase = { args: string[]; stdin: string };

export type CaseResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  /** 出力が上限を超えて切り捨てたか */
  truncated: boolean;
  durationMs: number;
};

export type RunResult = {
  compile: { ok: boolean; output: string; durationMs: number };
  results: CaseResult[];
};

type ExecResult = { code: number | null; stdout: string; stderr: string; timedOut: boolean; truncated: boolean };

/** docker コマンドを実行し、出力を上限まで集める */
function docker(args: string[], { input, timeoutMs }: { input?: string; timeoutMs: number }): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let size = 0;
    let truncated = false;
    let timedOut = false;

    const collect = (target: Buffer[]) => (chunk: Buffer) => {
      if (truncated) return;
      size += chunk.length;
      if (size > MAX_OUTPUT_BYTES) {
        truncated = true;
        target.push(chunk.subarray(0, Math.max(0, chunk.length - (size - MAX_OUTPUT_BYTES))));
        child.kill("SIGKILL");
        return;
      }
      target.push(chunk);
    };
    child.stdout.on("data", collect(out));
    child.stderr.on("data", collect(err));

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        code,
        stdout: Buffer.concat(out).toString("utf8"),
        stderr: Buffer.concat(err).toString("utf8"),
        timedOut,
        truncated,
      });
    });

    child.stdin.on("error", () => {}); // 相手が先に終わったときの書き込みエラーは無視する
    child.stdin.end(input ?? "");
  });
}

/** 同時に動かすコンテナの数を制限する */
let running = 0;
const waiting: (() => void)[] = [];

async function acquire() {
  if (running < CONCURRENCY) {
    running++;
    return;
  }
  await new Promise<void>((resolve) => waiting.push(resolve));
  running++;
}

function release() {
  running--;
  waiting.shift()?.();
}

export function queueStatus() {
  return { running, waiting: waiting.length, concurrency: CONCURRENCY };
}

/** コンパイルエラーのメッセージから、コンテナの中のパス（/work/）を取り除いて読みやすくする */
function cleanCompileOutput(text: string) {
  return text.replaceAll("/work/", "");
}

export async function runJava(code: string, cases: RunCase[]): Promise<RunResult> {
  await acquire();
  let containerId: string | null = null;
  try {
    // 何もしないコンテナを起動しておき、その中でコンパイル・実行する（--rm なので止めると消える）
    const started = await docker(["run", "-d", "--rm", ...SANDBOX_ARGS, IMAGE, "sleep", "120"], { timeoutMs: 30_000 });
    if (started.code !== 0) throw new Error(`コンテナを起動できませんでした: ${started.stderr.trim()}`);
    containerId = started.stdout.trim();

    // コードを書き込む（標準入力で渡す）
    const written = await docker(["exec", "-i", containerId, "sh", "-c", "cat > /work/Main.java"], {
      input: code,
      timeoutMs: 10_000,
    });
    if (written.code !== 0) throw new Error(`コードを書き込めませんでした: ${written.stderr.trim()}`);

    // イースターエッグ（eggs.ts）の仕掛けを置く。失敗しても演習には関係ないので、隠しクラスなしで続ける
    const eggs = eggSetup(code);
    const placed = await docker(["exec", "-i", containerId, "sh"], { input: eggs.script, timeoutMs: 10_000 });
    const eggSources = placed.code === 0 ? eggs.sources : [];

    // コンパイル（エラーメッセージは日本語で）。終わったら隠しクラスのソースは消し、.class だけ残す
    const compileStart = Date.now();
    const javac = ["javac", "-J-Xmx192m", "-J-Duser.language=ja", "-encoding", "UTF-8", "-d", "/work", "/work/Main.java", ...eggSources];
    const compiled = await docker(
      ["exec", containerId, "sh", "-c", `${javac.join(" ")}; status=$?; rm -f ${eggSources.join(" ")}; exit $status`],
      { timeoutMs: COMPILE_TIMEOUT_MS },
    );
    const compile = {
      ok: compiled.code === 0 && !compiled.timedOut,
      output: cleanCompileOutput(compiled.timedOut ? "コンパイルが時間内に終わりませんでした" : compiled.stderr + compiled.stdout),
      durationMs: Date.now() - compileStart,
    };
    if (!compile.ok) return { compile, results: [] };

    // テストケースごとに実行する。時間制限はコンテナの中（timeout）と外（docker の待ち時間）の両方でかける
    const results: CaseResult[] = [];
    for (const c of cases) {
      const start = Date.now();
      const r = await docker(
        [
          "exec", "-i", containerId,
          "timeout", "-s", "KILL", String(RUN_TIME_LIMIT_SEC),
          "java", "-Xmx128m", "-XX:+UseSerialGC", "-XX:TieredStopAtLevel=1",
          "-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8", "-Duser.language=ja",
          "-cp", "/work", "Main", ...c.args,
        ],
        { input: c.stdin, timeoutMs: (RUN_TIME_LIMIT_SEC + 3) * 1000 },
      );
      results.push({
        stdout: r.stdout,
        stderr: r.stderr,
        exitCode: r.code,
        // timeout コマンドで止めると 124 / 137 になる
        timedOut: r.timedOut || r.code === 124 || r.code === 137,
        truncated: r.truncated,
        durationMs: Date.now() - start,
      });
    }
    return { compile, results };
  } finally {
    if (containerId) await docker(["kill", containerId], { timeoutMs: 10_000 }).catch(() => {});
    release();
  }
}

/** 起動時に、コードを動かすイメージを用意しておく（初回の実行が遅くならないように） */
export async function ensureImage() {
  const found = await docker(["image", "inspect", IMAGE], { timeoutMs: 30_000 });
  if (found.code === 0) return;
  console.log(`${IMAGE} を取得しています…`);
  const pulled = await docker(["pull", IMAGE], { timeoutMs: 10 * 60_000 });
  if (pulled.code !== 0) throw new Error(`${IMAGE} を取得できませんでした: ${pulled.stderr}`);
}
