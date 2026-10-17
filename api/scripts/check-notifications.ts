/** 起動中のAPI・web・DBでレビュー通知とユーザー間の分離を確認する。 */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { pool } from "../src/db.js";
import { hashToken } from "../src/lib/session.js";

const ids: string[] = [];
const base = process.env.CHECK_API_URL ?? "http://localhost:4000";
async function fixture(role: "user" | "admin", mustChange = false) {
  const id = randomUUID();
  ids.push(id);
  const token = randomBytes(32).toString("hex");
  await pool.query(`INSERT INTO users(id,employee_no,name,role,password_hash,must_change_password) VALUES($1,$2,'notification verification',$3,'not-a-login-hash',$4)`, [id, `VERIFY-${id}`, role,mustChange]);
  await pool.query(`INSERT INTO sessions(id,user_id,expires_at) VALUES($1,$2,now()+interval '10 minutes')`, [hashToken(token),id]);
  return { id,token };
}
async function request(path: string, token: string, method = "GET", body?: unknown, expected = 200) {
  const response = await fetch(`${base}${path}`, { method,headers: { cookie: `session=${token}`,origin: "http://localhost:3000","Content-Type":"application/json" },body:body === undefined ? undefined : JSON.stringify(body) });
  const json = await response.json();
  assert.equal(response.status,expected,`${method} ${path}: ${JSON.stringify(json)}`);
  return json;
}
async function pending(userId: string, question: number, kind: "flow" | "code") {
  return (await pool.query(`INSERT INTO submissions(user_id,lesson_id,question_no,kind,content) VALUES($1,1,$2,$3,'{}') RETURNING id`, [userId,question,kind])).rows[0].id as string;
}

try {
  const user = await fixture("user");
  const other = await fixture("user");
  const admin = await fixture("admin");
  const initial = await fixture("user",true);
  await request("/notifications","", "GET",undefined,401);
  await request("/notifications",initial.token,"GET",undefined,403);
  await request("/notifications",admin.token,"GET",undefined,403);
  assert.deepEqual(await request("/notifications",user.token),{unread_count:0,review_version:"0:",notifications:[]});
  const approvedId = await pending(user.id,1,"flow");
  await request(`/notifications/${approvedId}/read`,user.token,"POST",{},404);
  await request(`/admin/submissions/${approvedId}/approve`,admin.token,"POST",{comment:"フロー図を確認しました。"});
  let feed = await request("/notifications",user.token);
  assert.equal(feed.unread_count,1);
  const approvedVersion = feed.review_version;
  assert.notEqual(approvedVersion,"0:");
  assert.equal(feed.notifications[0].id,approvedId);
  assert.equal(feed.notifications[0].status,"approved");
  assert.equal(feed.notifications[0].kind,"flow");
  assert.equal(feed.notifications[0].question_no,1);
  assert.equal(feed.notifications[0].lesson_number,6);
  assert.equal(feed.notifications[0].review_comment,"フロー図を確認しました。");
  assert.ok(!("content" in feed.notifications[0]));
  assert.deepEqual(await request("/notifications",other.token),{unread_count:0,review_version:"0:",notifications:[]});
  await request(`/notifications/${approvedId}/read`,other.token,"POST",{},404);
  await request("/notifications/not-a-uuid/read",user.token,"POST",{},400);
  const read = await request(`/notifications/${approvedId}/read`,user.token,"POST",{});
  const again = await request(`/notifications/${approvedId}/read`,user.token,"POST",{});
  assert.equal(read.notification.review_read_at,again.notification.review_read_at);
  await request(`/admin/submissions/${approvedId}/approve`,admin.token,"POST",{},409);
  assert.equal((await request("/notifications",user.token)).unread_count,0);
  assert.equal((await request("/notifications",user.token)).review_version,approvedVersion);

  const rejectedId = await pending(user.id,2,"code");
  await request(`/admin/submissions/${rejectedId}/reject`,admin.token,"POST",{comment:"変数名から意味が分かるように直してください。"});
  feed = await request("/notifications",user.token);
  assert.equal(feed.unread_count,1);
  assert.equal(feed.notifications[0].id,rejectedId);
  assert.equal(feed.notifications[0].status,"rejected");
  assert.notEqual(feed.review_version,approvedVersion);
  assert.equal(feed.notifications[0].kind,"code");
  assert.equal(feed.notifications[0].question_no,2);
  assert.equal(feed.notifications[0].review_comment,"変数名から意味が分かるように直してください。");
  const resubmitted = await pending(user.id,2,"code");
  await request(`/admin/submissions/${resubmitted}/approve`,admin.token,"POST",{});
  feed = await request("/notifications",user.token);
  assert.equal(feed.unread_count,2);
  assert.equal(feed.notifications.length,3);
  assert.equal(feed.notifications[0].id,resubmitted);
  const submissionState = await request("/lessons/1/submissions?question=2",user.token);
  assert.equal(submissionState.code.status,"approved");
  console.log("PASS: approval/rejection/comments, per-question resubmission history, unread persistence, idempotent reads and ownership/auth checks");

  await pool.query(`INSERT INTO submissions(user_id,lesson_id,question_no,kind,content,status,reviewed_at)
    SELECT $1,1,(n%5)+1,'code','{}','approved',now()-n*interval '1 hour' FROM generate_series(1,35) n`,[user.id]);
  feed = await request("/notifications",user.token);
  assert.equal(feed.notifications.length,30);
  assert.equal(feed.unread_count,37);
  assert.ok(feed.notifications.every((item: {review_read_at:string|null}) => item.review_read_at === null));
  console.log("PASS: maximum 30 results with unread priority; unread count includes older results");

  await pool.query(`INSERT INTO lesson_progress(user_id,lesson_id,status) VALUES($1,11,'in-progress')`,[user.id]);
  const response = await fetch("http://localhost:3000/home",{headers:{cookie:`session=${user.token}`},signal:AbortSignal.timeout(45000)});
  const html = await response.text();
  assert.equal(response.status,200);
  assert.ok(html.includes("レビュー結果の通知"));
  assert.ok(!html.includes("data-next-error-message="));
  console.log("PASS: learner Home renders notification bell");
} finally {
  if (ids.length) await pool.query(`DELETE FROM users WHERE id=ANY($1::uuid[])`,[ids]);
  await pool.end();
}
