import type { Lesson } from "@/lib/lessons";
import { request } from "./client";

export type CatalogLesson = Pick<Lesson, "id" | "number" | "title" | "minutes">;

// GET /lessons/catalog（サインイン不要）
export async function getCatalog(): Promise<CatalogLesson[]> {
  const { lessons } = await request<{ lessons: CatalogLesson[] }>("/lessons/catalog");
  return lessons;
}

// GET /lessons（自分の進捗つき）
export async function getLessons(options: { cookie?: string } = {}): Promise<Lesson[]> {
  const { lessons } = await request<{ lessons: Lesson[] }>("/lessons", options);
  return lessons;
}

export type ExerciseQuestion = {
  number: number;
  title: string;
  prompt: string;
  starterCode: string;
  /** 最初から用意しておく Main.java 以外のファイル（複数ファイルのレッスン） */
  starterFiles?: { path: string; content: string }[];
  /** graded = 全テスト合格で提出できる。open = 自由制作（コンパイルが通れば提出でき、評価はレビュー） */
  mode: "graded" | "open";
  /** 対話で動かす問題。console = 1 行ずつ入力、othello = 盤面をクリックして打つ */
  interactive?: "console" | "othello";
  examples: { args: string[]; expected: string; label?: string; stdin?: string }[];
};
export type LessonDetail = Lesson & { material_md: string | null; exercises: ExerciseQuestion[] };

// GET /lessons/:id（解放済みレッスンのMarkdown教材を含む）
export async function getLesson(id: number, options: { cookie?: string } = {}): Promise<LessonDetail> {
  const { lesson } = await request<{ lesson: LessonDetail }>(`/lessons/${id}`, options);
  return lesson;
}
