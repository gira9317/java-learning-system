import pg from "pg";
import { databaseUrl } from "./config/config.js";

export const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 });

// 待機中の接続が DB 側から切られたとき（DB の再起動など）に出るエラー。
// 受け取らないとプロセスごと落ちるので、ログだけ出す。切れた接続はプールが捨て、次の問い合わせでつなぎ直す
pool.on("error", (error) => {
  console.error("PostgreSQL の待機中の接続が切れました:", error.message);
});
