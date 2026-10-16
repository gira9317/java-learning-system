import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { port } from "./config/config.js";
import { originCheckMiddleware } from "./middleware/originCheckMiddleware.js";
import auth from "./routes/auth.js";
import lessons from "./routes/lessons.js";

const app = new Hono();

app.use(logger());
app.use(originCheckMiddleware);

app.get("/health", (c) => c.json({ ok: true }));
app.route("/auth", auth);
app.route("/lessons", lessons);

app.notFound((c) => c.json({ message: "Not Found" }, 404));
app.onError((error, c) => {
  console.error(error);
  return c.json({ message: "サーバーでエラーが発生しました" }, 500);
});

serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on http://localhost:${port}`);
});
