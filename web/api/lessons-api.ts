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
  examples: { args: string[]; expected: string; label?: string }[];
};
export type LessonDetail = Lesson & { material_md: string | null; exercises: ExerciseQuestion[] };

// GET /lessons/:id（解放済みレッスンのMarkdown教材を含む）
export async function getLesson(id: number, options: { cookie?: string } = {}): Promise<LessonDetail> {
  const { lesson } = await request<{ lesson: LessonDetail }>(`/lessons/${id}`, options);
  return lesson;
}
