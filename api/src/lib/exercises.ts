import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

const testSchema = z.object({
  args: z.array(z.string()).max(10),
  expected: z.string(),
  hidden: z.boolean().default(false),
  label: z.string().optional(),
});
const catalogSchema = z.record(z.string(), z.array(z.object({
  title: z.string().min(1),
  prompt: z.string().min(1),
  starterBody: z.string().optional(),
  starterCode: z.string().optional(),
  tests: z.array(testSchema).min(1),
})).length(5));

export async function getExercises(lessonId: number) {
  const raw = await readFile(join(process.cwd(), "content", "lessons", "exercises.json"), "utf8");
  const intro = await readFile(join(process.cwd(), "content", "lessons", "intro-exercises.json"), "utf8");
  const readability = await readFile(join(process.cwd(), "content", "lessons", "readability-exercises.json"), "utf8");
  const catalog = { ...catalogSchema.parse(JSON.parse(raw)), ...catalogSchema.parse(JSON.parse(intro)), ...catalogSchema.parse(JSON.parse(readability)) };
  return (catalog[String(lessonId)] ?? []).map((question, i) => ({
    ...question,
    number: i + 1,
    starterCode: question.starterCode ?? `public class Main {\n    public static void main(String[] args) {\n${question.starterBody ?? "        // TODO: ここに処理を書いてください"}\n    }\n}\n`,
  }));
}

/** 非公開テストをクライアントに渡さない。 */
export async function getPublicExercises(lessonId: number) {
  return (await getExercises(lessonId)).map(({ tests, ...question }) => ({
    ...question,
    examples: tests.filter((test) => !test.hidden).map(({ args, expected, label }) => ({ args, expected, label })),
  }));
}
