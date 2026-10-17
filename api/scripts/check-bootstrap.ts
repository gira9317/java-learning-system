/** 空の一時スキーマで実際の初期化コマンドを検証。既存テーブルは変更しない。 */
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";
import { pool } from "../src/db.js";
import { databaseUrl } from "../src/config/config.js";

const execute = promisify(execFile);
const schema = `bootstrap_check_${randomBytes(8).toString("hex")}`;
const connection = new URL(databaseUrl);
connection.searchParams.set("options", `-c search_path=${schema},public`);
const env = { ...process.env, DATABASE_URL: connection.href, SEED_INITIAL_PASSWORD: randomBytes(24).toString("hex") };
const client = await pool.connect();
try {
  await client.query(`CREATE SCHEMA "${schema}"`);
  for (const script of ["migrate", "seed", "import-lectures", "migrate", "seed", "import-lectures"]) {
    await execute(process.execPath, ["--import", "tsx", `scripts/${script}.ts`], { env, maxBuffer: 1024 * 1024 });
  }
  const lessons = await client.query(`SELECT id,level FROM "${schema}".lessons ORDER BY sort_order`);
  assert.equal(lessons.rowCount, 16);
  assert.deepEqual(lessons.rows.map((row) => row.id), [11,12,13,14,15,1,2,3,4,5,6,7,8,9,16,10]);
  assert.equal(lessons.rows.find((row) => row.id === 16)?.level, "refactor");
  const lectures = await client.query(`SELECT count(*)::int AS count FROM "${schema}".lectures WHERE material_md IS NOT NULL`);
  assert.equal(lectures.rows[0].count, 69);
  const users = await client.query(`SELECT count(*)::int AS count FROM "${schema}".users`);
  assert.equal(users.rows[0].count, 2);
  const progress = await client.query(`SELECT lesson_id,status FROM "${schema}".lesson_progress`);
  assert.deepEqual(progress.rows, [{ lesson_id: 11, status: "in-progress" }]);
  console.log("PASS: empty database initialization and repeat execution; 16 ordered lessons, 69 materials, 2 accounts, first intro unlocked");
} finally {
  await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  client.release();
  await pool.end();
}
