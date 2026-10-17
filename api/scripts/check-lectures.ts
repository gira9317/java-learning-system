/** 講義MDを正本として、教材の構造・DBへの反映・実際の画面を確認する。 */
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import { pool } from "../src/db.js";
import { hashToken } from "../src/lib/session.js";

const parserUrl = new URL("../../web/lib/lecture-material.ts", import.meta.url).href;
const { splitLectureMaterial } = await import(parserUrl);
const dir = join(process.cwd(), "content", "lectures");
const files = (await readdir(dir)).filter((file) => /^\d{2}-\d{2}\.md$/.test(file)).sort();
assert.ok(files.length > 0);
assert.equal(splitLectureMaterial("普通のMarkdown").body, "普通のMarkdown");
assert.equal(splitLectureMaterial("<!-- lecture-supplement:start -->\n不完全\n<!-- lecture-supplement:end -->").questions.length, 0);

let userId: string | null = null;
try {
  const lectures = await pool.query(`SELECT id,chapter_id,sort_order,title,material_md FROM lectures ORDER BY chapter_id,sort_order`);
  assert.equal(lectures.rowCount, files.length);
  let questionCount = 0;
  for (const file of files) {
    const [chapterId, sortOrder] = file.replace(".md", "").split("-").map(Number);
    const row = lectures.rows.find((lecture) => lecture.chapter_id === chapterId && lecture.sort_order === sortOrder);
    assert.ok(row, `Missing DB lecture: ${file}`);
    const raw = (await readFile(join(dir, file), "utf8")).replace(/\r\n/g, "\n");
    const match = raw.match(/^---\ntitle: (.+)\n---\n+([\s\S]*)$/);
    assert.ok(match, `Invalid front matter: ${file}`);
    assert.equal(match[1].trim(), row.title, `Title: ${file}`);
    const source = match[2].trim();
    assert.equal(row.material_md?.replace(/\r\n/g, "\n").trim(), source, `DB differs from ${file}; import edited MD with npm run content:import -- --force`);
    const parsed = splitLectureMaterial(source);
    assert.ok(parsed.introduction?.trim(), `Introduction: ${file}`);
    assert.ok(parsed.body.trim(), `Body: ${file}`);
    assert.equal(parsed.questions.length, 5, `Questions: ${file}`);
    assert.equal(parsed.questions.filter((question: { applied: boolean }) => question.applied).length, 1, `Applied question: ${file}`);
    assert.ok(parsed.option?.title && parsed.option.body, `Option: ${file}`);
    for (const question of parsed.questions) {
      assert.equal(question.choices.length, 4, file);
      assert.equal(new Set(question.choices).size, 4, file);
      assert.ok(question.correctIndex >= 0 && question.correctIndex < 4 && question.explanation.trim(), file);
    }
    assert.deepEqual(splitLectureMaterial(source.replace(/\n/g, "\r\n")), parsed);
    assert.equal(splitLectureMaterial(source.replace("### 問2", "### 問1")).questions.length, 0);
    questionCount += parsed.questions.length;
  }
  console.log(`PASS: ${files.length} MD files match DB; ${questionCount} four-choice questions, introductions and Option columns; CRLF and malformed-data fallback`);

  userId = randomUUID();
  const token = randomBytes(32).toString("hex");
  await pool.query(`INSERT INTO users(id,employee_no,name,role,password_hash,must_change_password) VALUES($1,$2,'lecture verification','user','not-a-login-hash',false)`, [userId, `VERIFY-${userId}`]);
  await pool.query(`INSERT INTO sessions(id,user_id,expires_at) VALUES($1,$2,now()+interval '5 minutes')`, [hashToken(token), userId]);
  for (const row of [lectures.rows[0], lectures.rows.at(-1)]) {
    const response = await fetch(`http://localhost:3000/lectures/${row.id}`, { headers: { cookie: `session=${token}` }, signal: AbortSignal.timeout(45000) });
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.equal((html.match(/type="radio"/g) ?? []).length, 20);
    assert.equal((html.match(/<details(?:\s|>)/g) ?? []).length, 2);
    assert.ok(!/<details[^>]*\sopen(?:=|\s|>)/.test(html));
    assert.ok(html.includes("OPTION"));
    assert.ok(!html.includes("NEXT_HTTP_ERROR_FALLBACK"));
    assert.ok(!html.includes("data-next-error-message="));
  }
  console.log("PASS: first/last lecture pages render 20 radio options, detailed material and Option");
} finally {
  if (userId) await pool.query(`DELETE FROM users WHERE id=$1`, [userId]);
  await pool.end();
}
