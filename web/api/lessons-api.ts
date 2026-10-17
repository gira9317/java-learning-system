import type { Lesson } from "@/lib/lessons";
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
