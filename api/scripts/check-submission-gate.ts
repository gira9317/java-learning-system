/** 不合格コードがレビュー待ちにならず、下書き・進捗を保持することを実行して確認。 */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { pool } from "../src/db.js";
import { hashToken } from "../src/lib/session.js";

const id = randomUUID();
const token = randomBytes(32).toString("hex");
const base = process.env.CHECK_API_URL ?? "http://localhost:4000";
async function request(path: string, method: string, body: unknown, expected: number) {
  const response = await fetch(`${base}${path}`, { method, headers: { cookie:`session=${token}`,origin:"http://localhost:3000","Content-Type":"application/json" },body:JSON.stringify(body) });
  const json = await response.json();
  assert.equal(response.status,expected,`${path}: ${JSON.stringify(json)}`);
  return json;
}
const code = (body: string) => `public class Main { public static void main(String[] args) { ${body} } }`;

try {
  await pool.query(`INSERT INTO users(id,employee_no,name,role,password_hash,must_change_password) VALUES($1,$2,'submission gate verification','user','not-a-login-hash',false)`,[id,`VERIFY-${id}`]);
  await pool.query(`INSERT INTO sessions(id,user_id,expires_at) VALUES($1,$2,now()+interval '10 minutes')`,[hashToken(token),id]);
  await pool.query(`INSERT INTO lesson_progress(user_id,lesson_id,status) VALUES($1,11,'in-progress'),($1,3,'in-progress')`,[id]);
  await pool.query(`INSERT INTO submissions(user_id,lesson_id,question_no,kind,content,status) VALUES($1,3,1,'flow','{}','approved')`,[id]);
  const draft = {code:code('System.out.println("下書きを保持");')};
  await request("/lessons/11/drafts/code?question=1","PUT",draft,200);
  for (const source of ["public class Main { invalid java",code('System.out.println("違う出力");'),code('throw new RuntimeException("実行時エラー");')]) {
    const rejected = await request("/lessons/11/submissions?question=1","POST",{kind:"code",content:{code:source},autoResults:[{ok:true}]},422);
    assert.equal(rejected.code,"TESTS_FAILED");
    assert.ok(!rejected.grade.compile.ok || rejected.grade.results.some((result:{ok:boolean})=>!result.ok));
  }
  assert.equal((await pool.query(`SELECT count(*)::int AS count FROM submissions WHERE user_id=$1 AND kind='code'`,[id])).rows[0].count,0);
  assert.deepEqual((await pool.query(`SELECT content FROM drafts WHERE user_id=$1 AND lesson_id=11`,[id])).rows[0].content,draft);
  assert.equal((await pool.query(`SELECT status FROM lesson_progress WHERE user_id=$1 AND lesson_id=11`,[id])).rows[0].status,"in-progress");
  const failed = await request("/lessons/3/submissions?question=1","POST",{kind:"code",content:{code:code('System.out.println("不正解");')},autoResults:[{ok:true}]},422);
  const hidden = failed.grade.results.filter((result:{hidden:boolean})=>result.hidden);
  assert.ok(hidden.length>0);
  for (const result of hidden) {
    assert.equal(result.input,"（非公開）");
    assert.equal(result.expected,"（非公開）");
    assert.equal(result.actual,"（非公開）");
  }
  console.log("PASS: compile/output/runtime failures rejected; forged pass results ignored; draft/progress retained; hidden cases masked");

  const accepted = await request("/lessons/11/submissions?question=1","POST",{kind:"code",content:{code:code('System.out.println("こんにちは");')},autoResults:[{ok:false}]},201);
  assert.equal(accepted.submission.status,"pending");
  const saved = (await pool.query(`SELECT auto_results FROM submissions WHERE id=$1`,[accepted.submission.id])).rows[0];
  assert.ok(saved.auto_results.length>0 && saved.auto_results.every((result:{ok:boolean})=>result.ok));
  assert.equal((await pool.query(`SELECT count(*)::int AS count FROM drafts WHERE user_id=$1 AND lesson_id=11`,[id])).rows[0].count,0);
  console.log("PASS: all-pass code enters review with server-verified results; successful submission clears its draft");
} finally {
  await pool.query(`DELETE FROM users WHERE id=$1`,[id]);
  await pool.end();
}
