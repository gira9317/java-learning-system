/** api/から実行。全教材・DB・実際の画面応答と、本文を保護する更新規則を確認する。 */
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import { pool } from "../src/db.js";
import { hashToken } from "../src/lib/session.js";
import { loadLectureSupplements, mergeLectureSupplement, mergeLectureIntroduction, SUPPLEMENT_START, SUPPLEMENT_END } from "../src/lib/lecture-supplements.js";

const parserUrl = new URL("../../web/lib/lecture-material.ts", import.meta.url).href;
const { splitLectureMaterial } = await import(parserUrl);
const dir = join(process.cwd(), "content", "lectures");
const supplements = await loadLectureSupplements();
const files = (await readdir(dir)).filter((file) => /^\d{2}-\d{2}\.md$/.test(file));
assert.equal(files.length, 69);
assert.equal(Object.keys(supplements).length, files.length);

const sample = supplements["01-01"];
const original = "## 管理画面で編集した本文\n\n残す文章です。\n\n> **確認しよう**\n>\n> - 古い問題\n\n管理者による追記です。\n";
const merged = mergeLectureSupplement(original, sample);
assert.ok(merged.includes("管理画面で編集した本文"));
assert.ok(merged.includes("管理者による追記です。"));
assert.ok(!merged.includes("古い問題"));
assert.equal(mergeLectureSupplement(merged, sample), merged);
assert.equal(mergeLectureSupplement(merged.replace(/\n/g, "\r\n"), sample), merged);
const withTail = `${merged}\n末尾にも残す追記。\n`;
assert.ok(mergeLectureSupplement(withTail, sample).endsWith("末尾にも残す追記。\n"));
assert.throws(() => mergeLectureSupplement(`${SUPPLEMENT_START}\n壊れた境界`, sample));
assert.equal(splitLectureMaterial("普通のMarkdown").body, "普通のMarkdown");
assert.equal(splitLectureMaterial(`${SUPPLEMENT_START}\n不完全\n${SUPPLEMENT_END}`).questions.length, 0);
assert.equal(splitLectureMaterial(merged.replace("### 問2", "### 問1")).questions.length, 0);
console.log("PASS: idempotent updates, manual-edit preservation, CRLF, malformed-data fallback");

let userId: string | null = null;
try {
  const lectures = await pool.query(`SELECT id,chapter_id,sort_order,title,material_md FROM lectures ORDER BY chapter_id,sort_order`);
  assert.equal(lectures.rowCount, files.length);
  for (const row of lectures.rows) {
    const key = `${String(row.chapter_id).padStart(2, "0")}-${String(row.sort_order).padStart(2, "0")}`;
    const source = (await readFile(join(dir, `${key}.md`), "utf8")).replace(/^---\ntitle: .+\n---\n+/, "");
    for (const material of [source, row.material_md]) {
      assert.ok(material);
      const parsed = splitLectureMaterial(material);
      assert.equal(parsed.questions.length, 5, key);
      assert.ok(parsed.introduction?.includes("最初に覚える4つの言葉"), key);
      assert.ok(parsed.body.length > 100, key);
      assert.ok(!parsed.body.includes("#### 解答・解説"), key);
      assert.equal(parsed.questions.filter((q: { applied: boolean }) => q.applied).length, 1, key);
      assert.equal(parsed.option.title, supplements[key].column[0], key);
      for (let i = 0; i < 5; i++) {
        assert.equal(parsed.questions[i].prompt, supplements[key].questions[i].prompt, key);
        assert.equal(parsed.questions[i].explanation, supplements[key].questions[i].explanation, key);
        assert.deepEqual(parsed.questions[i].choices, supplements[key].questions[i].choices, key);
        assert.equal(parsed.questions[i].correctIndex, supplements[key].questions[i].correctIndex, key);
        assert.equal(new Set(parsed.questions[i].choices).size,4,key);
      }
    }
  }
  console.log("PASS: all 69 MD files and DB records contain 345 matching Q&A pairs and 69 columns");
  const positions = [0,0,0,0];
  for (const supplement of Object.values(supplements)) for (const question of supplement.questions) positions[question.correctIndex]++;
  assert.ok(positions.every((n)=>n>50));
  console.log(`PASS: 4 distinct options each, beginner introductions, correct-answer positions ${positions.join('/')}`);
  const backups = (await readdir(join(process.cwd(), ".tmp", "lecture-backups")).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [] as string[];
    throw error;
  })).filter((name) => name.endsWith(".json")).sort();
  const before = backups.length ? JSON.parse(await readFile(join(process.cwd(), ".tmp", "lecture-backups", backups[0]), "utf8")) : [];
  for (const old of before) {
    const row = lectures.rows.find((r) => r.id === old.id)!;
    const key = `${String(row.chapter_id).padStart(2, "0")}-${String(row.sort_order).padStart(2, "0")}`;
    if (old.material_md) assert.equal(mergeLectureIntroduction(mergeLectureSupplement(old.material_md, supplements[key]), supplements[key].introduction), row.material_md, key);
  }
  console.log(backups.length ? "PASS: original DB material preserved outside the confirmation/supplement blocks" : "SKIP: backup comparison (no local material backup); merge-preservation checks still ran");

  userId = randomUUID();
  const token = randomBytes(32).toString("hex");
  await pool.query(`INSERT INTO users(id,employee_no,name,role,password_hash,must_change_password) VALUES($1,$2,'lecture verification','user','not-a-login-hash',false)`, [userId, `VERIFY-${userId}`]);
  await pool.query(`INSERT INTO sessions(id,user_id,expires_at) VALUES($1,$2,now()+interval '5 minutes')`, [hashToken(token), userId]);
  for (const row of [lectures.rows[0], lectures.rows.at(-1)]) {
    const response = await fetch(`http://localhost:3000/lectures/${row.id}`, { headers: { cookie: `session=${token}` }, signal: AbortSignal.timeout(45000) });
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.ok(html.includes('type="radio"'));
    assert.equal((html.match(/type="radio"/g) ?? []).length, 20);
    assert.equal((html.match(/<details(?:\s|>)/g) ?? []).length, 2);
    assert.ok(!/<details[^>]*\sopen(?:=|\s|>)/.test(html));
    assert.ok(html.includes("OPTION"));
    assert.ok(!html.includes("NEXT_HTTP_ERROR_FALLBACK"));
  }
  console.log("PASS: first/last lecture pages render 20 radio options, detailed material, and Option");
} finally {
  if (userId) await pool.query(`DELETE FROM users WHERE id=$1`, [userId]);
  await pool.end();
}
