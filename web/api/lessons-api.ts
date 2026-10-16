import type { Lesson, LessonStatus } from "@/lib/lessons";
import { request } from "./client";

export type CatalogLesson = Pick<Lesson, "id" | "title" | "minutes">;

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

// PUT /lessons/:id/progress
export async function updateProgress(lessonId: number, status: Exclude<LessonStatus, "locked">) {
  return request<{ progress: { lessonId: number; status: LessonStatus }; unlocked: number | null }>(
    `/lessons/${lessonId}/progress`,
    { method: "PUT", body: { status } },
  );
}
