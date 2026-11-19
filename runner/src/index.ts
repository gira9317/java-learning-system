import { serve } from "@hono/node-server";
import { Hono, type Context, type Next } from "hono";
import { bodyLimit } from "hono/body-limit";
import { logger } from "hono/logger";
import { z } from "zod";
import { ensureImage, filesSchema, queueStatus, runJava } from "./sandbox.js";
import { readMore, sendLine, sessionCount, SessionLimitError, startSession, stopSession } from "./session.js";

// 実行サーバー。API からだけ呼ばれる（合言葉 RUNNER_TOKEN を知っている相手だけ受け付ける）。
// コンテナを起動できる＝サーバーの管理者に近い権限を持つので、外部には公開しない。

const port = Number(process.env.PORT ?? 5000);
const token = process.env.RUNNER_TOKEN;
if (!token) {
  throw new Error("RUNNER_TOKEN is not set");
}

const runSchema = z.object({
  code: z.string().min(1).max(20_000),
  /** Main.java 以外のファイル（package のフォルダの中のクラスなど） */
  files: filesSchema.default([]),
  cases: z
    .array(
      z.object({
        args: z.array(z.string().max(200)).max(40).default([]),
        stdin: z.string().max(10_000).default(""),
      }),
    )
    .max(20),
});

const sessionSchema = z.object({
  code: z.string().min(1).max(20_000),
  files: filesSchema.default([]),
});
const lineSchema = z.object({ line: z.string().max(1000) });
const idSchema = z.uuid();

const app = new Hono();
app.use(logger());

app.get("/health", (c) => c.json({ ok: true, ...queueStatus(), sessions: sessionCount() }));

const requireToken = async (c: Context, next: Next) => {
  if (c.req.header("authorization") !== `Bearer ${token}`) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  await next();
};
app.use("/run", requireToken);
app.use("/sessions", requireToken);
app.use("/sessions/*", requireToken);

app.post("/run", bodyLimit({ maxSize: 256 * 1024 }), async (c) => {
  const parsed = runSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ message: "入力内容が正しくありません" }, 400);
  }
  const result = await runJava(parsed.data.code, parsed.data.cases, parsed.data.files);
  return c.json(result);
});

/* ---------- 対話型の実行（1 行入力するたびに応答を返す） ---------- */

app.post("/sessions", bodyLimit({ maxSize: 256 * 1024 }), async (c) => {
  const parsed = sessionSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ message: "入力内容が正しくありません" }, 400);
  try {
    return c.json(await startSession(parsed.data.code, parsed.data.files));
  } catch (error) {
    if (error instanceof SessionLimitError) return c.json({ message: error.message }, 503);
    throw error;
  }
});

app.post("/sessions/:id/input", bodyLimit({ maxSize: 8 * 1024 }), async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));
  const body = lineSchema.safeParse(await c.req.json().catch(() => null));
  if (!id.success || !body.success) return c.json({ message: "入力内容が正しくありません" }, 400);
  const out = await sendLine(id.data, body.data.line);
  return out ? c.json(out) : c.json({ message: "実行は終了しています" }, 404);
});

app.post("/sessions/:id/read", async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ message: "入力内容が正しくありません" }, 400);
  const out = await readMore(id.data);
  return out ? c.json(out) : c.json({ message: "実行は終了しています" }, 404);
});

app.delete("/sessions/:id", async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ message: "入力内容が正しくありません" }, 400);
  return c.json({ stopped: await stopSession(id.data) });
});

app.onError((error, c) => {
  console.error(error);
  return c.json({ message: "実行環境でエラーが発生しました" }, 500);
});

await ensureImage();
serve({ fetch: app.fetch, port }, () => {
  console.log(`Runner running on http://localhost:${port}`);
});
