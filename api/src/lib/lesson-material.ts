import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** APIはapi/を作業ディレクトリとして起動する（開発・Docker共通）。 */
export async function readLessonMaterial(id: number, title: string): Promise<string | null> {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Invalid lesson ID");
  const path = join(process.cwd(), "content", "lessons", `${String(id).padStart(2, "0")}.md`);
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  const match = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").match(/^---\ntitle: (.+)\n---\n+([\s\S]*)$/);
  if (!match || match[1].trim() !== title) {
    throw new Error(`Lesson ${id}: material title does not match`);
  }
  return match[2].trim() || null;
}
