/*
 * db/migrations/*.sql を名前順に、まだ適用していないものだけ実行する。
 *   npm run db:migrate
 * テーブルを変えるときは、既存のファイルは書き換えず、0002_xxx.sql のように新しいファイルを足す。
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pool } from "../src/db.js";

// api/ で実行する（npm run db:migrate でも、Docker の起動時でも）
const dir = join(process.cwd(), "db", "migrations");

await pool.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name       text        PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`);

const applied = new Set((await pool.query(`SELECT name FROM schema_migrations`)).rows.map((r) => r.name));
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

for (const file of files) {
  if (applied.has(file)) continue;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(await readFile(join(dir, file), "utf8"));
    await client.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [file]);
    await client.query("COMMIT");
    console.log(`applied: ${file}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`failed: ${file}`);
    throw error;
  } finally {
    client.release();
  }
}

console.log("migrations up to date");
await pool.end();
