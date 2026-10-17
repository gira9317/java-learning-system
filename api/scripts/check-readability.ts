import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { pool } from "../src/db.js";
import { hashToken } from "../src/lib/session.js";
import { completeLesson, getLessonStages } from "../src/lib/progress.js";

const userId = randomUUID();
try {
  await pool.query(`INSERT INTO users(id,employee_no,name,role,password_hash,must_change_password)
    VALUES($1,$2,'readability verification','user','not-a-login-hash',false)`, [userId, `VERIFY-${userId}`]);
  const token = randomBytes(32).toString("hex");
  await pool.query(`INSERT INTO sessions(id,user_id,expires_at) VALUES($1,$2,now()+interval '10 minutes')`, [hashToken(token),userId]);
  await pool.query(`INSERT INTO lesson_progress(user_id,lesson_id,status) VALUES($1,9,'in-progress')`,[userId]);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const lessonId of [9,16]) {
      if (lessonId === 16) {
        assert.equal(await completeLesson(client,userId,16),null);
        const stages = await getLessonStages(userId,16,client);
        assert.equal(stages?.code.canSubmit,true);
        assert.equal(stages?.flow.canSubmit,false);
      }
      await client.query(`INSERT INTO submissions(user_id,lesson_id,question_no,kind,content,status)
        SELECT $1,$2,n,'code','{}','approved' FROM generate_series(1,5) AS n`,[userId,lessonId]);
      assert.equal(await completeLesson(client,userId,lessonId),lessonId===9 ? 16 : 10);
    }
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
  console.log("PASS: class lesson unlocks refactoring; all 5 approvals unlock exception lesson");

  for (const path of ["/lessons/16", "/lessons/16/exercise?question=1", "/lessons/16/exercise?question=5"]) {
    const response = await fetch(`http://localhost:3000${path}`, {headers:{cookie:`session=${token}`},signal:AbortSignal.timeout(45000)});
    const html = await response.text();
    assert.equal(response.status,200,path);
    assert.ok(html.includes("読みやすいコードと責務の分け方"),path);
    assert.ok(!html.includes("NEXT_HTTP_ERROR_FALLBACK"),path);
    assert.ok(!html.includes('data-next-error-message='),path);
    if (path === "/lessons/16") {
      assert.ok(html.includes("神クラス"));
      assert.ok(html.includes("メッセージチェーン"));
    } else {
      assert.ok(html.includes(path.endsWith("1") ? "名前を読めば意味が分かる計算にしよう" : "getの連鎖をやめて、必要な情報を頼もう"));
      assert.ok(!html.includes('aria-label="フロー図"'));
    }
  }
  console.log("PASS: lesson material and first/last exercise pages render");
} finally {
  await pool.query(`DELETE FROM users WHERE id=$1`,[userId]);
  await pool.end();
}
