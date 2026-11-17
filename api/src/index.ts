import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { port } from "./config/config.js";
import { originCheckMiddleware } from "./middleware/originCheckMiddleware.js";
import auth from "./routes/auth.js";
import admin from "./routes/admin.js";
import lectures from "./routes/lectures.js";
import lessons from "./routes/lessons.js";
import notifications from "./routes/notifications.js";

const app = new Hono();

app.use(logger());
app.use(secureHeaders());
app.use(originCheckMiddleware);

app.get("/health", (c) => c.json({ ok: true }));
app.route("/auth", auth);
app.route("/lectures", lectures);
app.route("/lessons", lessons);
app.route("/notifications", notifications);
app.route("/admin", admin);

app.notFound((c) => c.json({ message: "Not Found" }, 404));
app.onError((error, c) => {
  console.error(error);
  return c.json({ message: "サーバーでエラーが発生しました" }, 500);
});

serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on http://localhost:${port}`);
});
