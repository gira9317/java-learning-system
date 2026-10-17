import "server-only";
import { notFound } from "next/navigation";
import { getCatalog, getLesson, getLessons } from "@/api/lessons-api";
import { getLessonSubmissions } from "@/api/submissions-api";
import { pad } from "@/lib/lessons";
import { getCookieHeader, requireLearner } from "@/lib/session";

// コード演習の「教材」「演習」ページで共通の読み込み処理

/** URL の [id] をレッスン ID（正の整数）にする。不正なら null */
export function parseLessonId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** タブのタイトル（サインイン不要の目次から取る） */
export async function lessonTitle(rawId: string, suffix: string) {
  const id = parseLessonId(rawId);
  const lesson = id ? (await getCatalog()).find((l) => l.id === id) : undefined;
  return lesson ? `Lesson ${pad(lesson.number)} ${lesson.title}（${suffix}）— Java Training` : "Java Training";
}

/**
 * レッスンと全レッスン（進み具合の表示用）、提出の状況を読み込む。
 * 存在しなければ 404。未解放のレッスンなら submissions は null（呼び出し側で案内を出す）
 */
export async function loadLesson(rawId: string, questionNo = 1) {
  const id = parseLessonId(rawId);
  if (!id) notFound();

  await requireLearner();
  const cookie = await getCookieHeader();
  const lessons = await getLessons({ cookie });
  const lesson = lessons.find((l) => l.id === id);
  if (!lesson) notFound();

  const current = lessons.find((l) => l.status === "in-progress");
  if (lesson.status === "locked") {
    return { lesson, lessons, current, submissions: null, materialMd: null, exercises: [] };
  }
  const [detail, submissions] = await Promise.all([
    getLesson(lesson.id, { cookie }),
    getLessonSubmissions(lesson.id, { cookie, questionNo }),
  ]);
  return { lesson, lessons, current, submissions, materialMd: detail.material_md, exercises: detail.exercises };
}
