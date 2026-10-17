import { request } from "./client";

type Cookie = { cookie?: string };

export type LectureListItem = {
  id: number;
  chapter_id: number;
  section: string | null;
  title: string;
  has_video: boolean;
  has_material: boolean;
  completed: boolean;
};

export type LectureChapter = {
  id: number;
  title: string;
  page_start: number | null;
  page_end: number | null;
  lectures: LectureListItem[];
};

export type Lecture = {
  id: number;
  chapter_id: number;
  chapter_title: string;
  page_start: number | null;
  page_end: number | null;
  section: string | null;
  title: string;
  video_url: string | null;
  material_md: string | null;
  updated_at: string;
  prev_id: number | null;
  next_id: number | null;
  completed: boolean;
};

// GET /lectures（目次）
export async function getLectureChapters(options: Cookie = {}) {
  const { chapters } = await request<{ chapters: LectureChapter[] }>("/lectures", options);
  return chapters;
}

// GET /lectures/:id
export async function getLecture(id: number, options: Cookie = {}) {
  const { lecture } = await request<{ lecture: Lecture }>(`/lectures/${id}`, options);
  return lecture;
}

// PUT /lectures/:id/progress（視聴・読了済みのチェック）
export async function setLectureCompleted(id: number, completed: boolean) {
  return request<{ completed: boolean }>(`/lectures/${id}/progress`, { method: "PUT", body: { completed } });
}
