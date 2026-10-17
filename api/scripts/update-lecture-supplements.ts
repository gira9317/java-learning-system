/** api/から実行。本文を保持して小テスト・Optionのみ更新する。DB更新前の資料を退避する。 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pool } from "../src/db.js";
import { loadLectureSupplements, mergeLectureSupplement, mergeLectureIntroduction } from "../src/lib/lecture-supplements.js";

const client = await pool.connect();
try {
  const supplements = await loadLectureSupplements();
  const updates = [];
  await client.query("BEGIN");
  for (const [key, supplement] of Object.entries(supplements)) {
    const path = join(process.cwd(), "content", "lectures", `${key}.md`);
    const raw = (await readFile(path, "utf8")).replace(/\r\n/g, "\n");
    const match = raw.match(/^---\ntitle: (.+)\n---\n+([\s\S]*)$/);
    if (!match) throw new Error(`Invalid lecture front matter: ${key}`);
    const [chapterId, sortOrder] = key.split("-").map(Number);
    const rows = await client.query(`SELECT id,title,material_md,updated_at FROM lectures WHERE chapter_id=$1 AND sort_order=$2 FOR UPDATE`, [chapterId, sortOrder]);
    if (rows.rowCount !== 1 || rows.rows[0].title !== match[1].trim()) throw new Error(`Lecture title mismatch: ${key}`);
    const row = rows.rows[0];
    updates.push({
      path,
      file: mergeLectureIntroduction(mergeLectureSupplement(raw, supplement), supplement.introduction),
      before: row,
      after: mergeLectureIntroduction(mergeLectureSupplement(row.material_md ?? match[2], supplement), supplement.introduction),
    });
  }
  const backupDir = join(process.cwd(), ".tmp", "lecture-backups");
  await mkdir(backupDir, { recursive: true });
  const backup = join(backupDir, `materials-${Date.now()}.json`);
  await writeFile(backup, JSON.stringify(updates.map((update) => update.before), null, 2), "utf8");
  for (const update of updates) {
    await writeFile(update.path, update.file, "utf8");
    if (update.before.material_md !== update.after) {
      await client.query(`UPDATE lectures SET material_md=$1,updated_at=now() WHERE id=$2`, [update.after, update.before.id]);
    }
  }
  await client.query("COMMIT");
  console.log(`Updated ${updates.length} lectures: ${updates.length * 5} questions and ${updates.length} optional columns.`);
  console.log(`Backup: ${backup}`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
