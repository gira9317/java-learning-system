/*
 * 講義の資料（Markdown）を content/lectures/ から DB に取り込む。
 *   npm run content:import            … 資料が未登録の講義にだけ入れる（管理画面で編集した内容は上書きしない）
 *   npm run content:import -- --force … ファイルの内容で上書きする
 *
 * ファイル名は「章番号-並び順.md」（例: 01-07.md = 第1章の 7 番目）。
 * 先頭の front matter の title が DB の講義名と一致しないときは、取り違えを防ぐため取り込まない。
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pool } from "../src/db.js";

// api/ で実行する（npm run content:import でも、Docker の起動時でも）
const dir = join(process.cwd(), "content", "lectures");
const force = process.argv.includes("--force");

const files = (await readdir(dir)).filter((f) => /^\d{2}-\d{2}\.md$/.test(f)).sort();
let imported = 0;
let skipped = 0;

for (const file of files) {
  const [chapterId, sortOrder] = file.replace(".md", "").split("-").map(Number);
  const raw = (await readFile(join(dir, file), "utf8")).replace(/\r\n/g, "\n");

  const match = raw.match(/^---\ntitle: (.+)\n---\n+([\s\S]*)$/);
  if (!match) {
    console.warn(`skip ${file}: 先頭に「---\\ntitle: ...\\n---」がありません`);
    skipped++;
    continue;
  }
  const [, title, body] = match;

  const lecture = await pool.query(`SELECT id, title FROM lectures WHERE chapter_id = $1 AND sort_order = $2`, [
    chapterId,
    sortOrder,
  ]);
  if (lecture.rowCount === 0 || lecture.rows[0].title !== title.trim()) {
    console.warn(`skip ${file}: DB の講義名「${lecture.rows[0]?.title ?? "（なし）"}」と title「${title}」が一致しません`);
    skipped++;
    continue;
  }

  const result = await pool.query(
    `
    UPDATE lectures
    SET material_md = $1, updated_at = now()
    WHERE id = $2 AND ($3 OR material_md IS NULL)
    `,
    [body.trim() + "\n", lecture.rows[0].id, force],
  );
  if (result.rowCount) imported++;
  else skipped++;
}

console.log(`資料: ${imported} 件を取り込み、${skipped} 件はそのまま（${force ? "上書きモード" : "未登録のものだけ"}）`);
await pool.end();
