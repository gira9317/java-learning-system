import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

const testSchema = z.object({
  args: z.array(z.string()).max(40),
  /** 標準入力（Scanner で読む入力。対話型のプログラムの採点に使う） */
  stdin: z.string().optional(),
  expected: z.string(),
  hidden: z.boolean().default(false),
  label: z.string().optional(),
});
const questionSchema = z.object({
  title: z.string().min(1),
  prompt: z.string().min(1),
  starterBody: z.string().optional(),
  starterCode: z.string().optional(),
  /** 最初から用意しておく Main.java 以外のファイル（複数ファイルのレッスン）。フォルダは package */
  starterFiles: z.array(z.object({ path: z.string().min(1), content: z.string() })).optional(),
  /**
   * graded = テストに全部合格してから提出する（これまでの問題）。
   * open = 正解を 1 つに決めない自由制作。コンパイルが通れば提出でき、評価は研修担当者のレビューで行う。
   * open の tests は「動作の目安」として採点に出すだけで、提出の条件にはしない。
   */
  mode: z.enum(["graded", "open"]).default("graded"),
  /** 実行パネルの形。console = 1 行ずつ入力して応答を見る対話、othello = 盤面をクリックして打つ */
  interactive: z.enum(["console", "othello"]).optional(),
  tests: z.array(testSchema).default([]),
  /**
   * 解釈が分かれるように書いた問題の、研修担当者向けのメモ（受講者には見せない）。
   * 受講者がコードを書く前に質問してくることを想定し、どこが曖昧で、聞かれたら何と答えるかを書いておく。
   */
  clarification: z.object({ point: z.string().min(1), answer: z.string().min(1) }).optional(),
}).refine((q) => q.mode === "open" || q.tests.length > 0, "採点する問題にはテストが必要です");

const catalogSchema = z.record(z.string(), z.array(questionSchema).length(5));

/** 演習問題のファイル。レッスン ID をキーに、5 問ずつ並べる */
const EXERCISE_FILES = ["exercises.json", "intro-exercises.json", "readability-exercises.json", "advanced-exercises.json"];

export async function getExercises(lessonId: number) {
  const catalog: z.infer<typeof catalogSchema> = {};
  for (const file of EXERCISE_FILES) {
    Object.assign(catalog, catalogSchema.parse(JSON.parse(await readFile(join(process.cwd(), "content", "lessons", file), "utf8"))));
  }
  return (catalog[String(lessonId)] ?? []).map((question, i) => ({
    ...question,
    number: i + 1,
    starterCode: question.starterCode ?? `public class Main {\n    public static void main(String[] args) {\n${question.starterBody ?? "        // TODO: ここに処理を書いてください"}\n    }\n}\n`,
  }));
}

/** 非公開テストと研修担当者向けのメモをクライアントに渡さない。 */
export async function getPublicExercises(lessonId: number) {
  return (await getExercises(lessonId)).map(({ tests, clarification: _clarification, ...question }) => ({
    ...question,
    examples: tests.filter((test) => !test.hidden).map(({ args, expected, label, stdin }) => ({ args, expected, label, stdin })),
  }));
}

/** 管理画面のレビュー用。受講者向けの内容に、研修担当者向けのメモを足す。 */
export async function getReviewExercise(lessonId: number, questionNo: number) {
  const question = (await getExercises(lessonId)).find((q) => q.number === questionNo);
  if (!question) return null;
  const { tests, clarification, ...rest } = question;
  return {
    ...rest,
    examples: tests.filter((test) => !test.hidden).map(({ args, expected, label, stdin }) => ({ args, expected, label, stdin })),
    clarification: clarification ?? null,
  };
}
