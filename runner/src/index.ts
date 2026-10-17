import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { logger } from "hono/logger";
import { z } from "zod";
import { ensureImage, queueStatus, runJava } from "./sandbox.js";

// 実行サーバー。API からだけ呼ばれる（合言葉 RUNNER_TOKEN を知っている相手だけ受け付ける）。
// コンテナを起動できる＝サーバーの管理者に近い権限を持つので、外部には公開しない。

const port = Number(process.env.PORT ?? 5000);
const token = process.env.RUNNER_TOKEN;
if (!token) {
  throw new Error("RUNNER_TOKEN is not set");
}

const runSchema = z.object({
  code: z.string().min(1).max(20_000),
  cases: z
    .array(
      z.object({
        args: z.array(z.string().max(200)).max(10).default([]),
        stdin: z.string().max(10_000).default(""),
      }),
    )
    .min(1)
    .max(20),
});

const app = new Hono();
app.use(logger());

app.get("/health", (c) => c.json({ ok: true, ...queueStatus() }));

app.use("/run", async (c, next) => {
  if (c.req.header("authorization") !== `Bearer ${token}`) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  await next();
});

app.post("/run", bodyLimit({ maxSize: 256 * 1024 }), async (c) => {
  const parsed = runSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ message: "入力内容が正しくありません" }, 400);
  }
  const result = await runJava(parsed.data.code, parsed.data.cases);
  return c.json(result);
});

app.onError((error, c) => {
  console.error(error);
  return c.json({ message: "実行環境でエラーが発生しました" }, 500);
});

await ensureImage();
serve({ fetch: app.fetch, port }, () => {
  console.log(`Runner running on http://localhost:${port}`);
});
