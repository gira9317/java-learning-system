import type { LessonStatus } from "@/lib/lessons";
import { request } from "./client";
import type { CodeContent, FlowContent, SubmissionKind, SubmissionStatus } from "./submissions-api";

type Cookie = { cookie?: string };

export type AdminUserRow = {
  id: string;
  employee_no: string;
  name: string;
  role: "user" | "admin";
  must_change_password: boolean;
  created_at: string;
  completed_count: number;
  lesson_count: number;
  current_lesson: string | null;
  pending_count: number;
  last_activity_at: string | null;
};

export type AdminUserDetail = {
  user: Pick<AdminUserRow, "id" | "employee_no" | "name" | "role" | "must_change_password" | "created_at">;
  lessons: {
    id: number;
    title: string;
    status: LessonStatus;
    flow_status: SubmissionStatus | null;
    code_status: SubmissionStatus | null;
  }[];
  submissions: {
    id: string;
    lesson_id: number;
    lesson_title: string;
    kind: SubmissionKind;
    status: SubmissionStatus;
    review_comment: string | null;
    reviewed_at: string | null;
    created_at: string;
  }[];
};

export type AdminSubmissionRow = {
  id: string;
  kind: SubmissionKind;
  status: SubmissionStatus;
  created_at: string;
  reviewed_at: string | null;
  lesson_id: number;
  lesson_title: string;
  user_id: string;
  employee_no: string;
  name: string;
};

export type AdminSubmissionDetail = AdminSubmissionRow & {
  content: FlowContent | CodeContent;
  auto_results: Record<string, unknown>[] | null;
  review_comment: string | null;
  reviewer_name: string | null;
};

// GET /admin/summary（ナビのバッジ用）
export async function getAdminSummary(options: Cookie = {}) {
  return request<{ pendingCount: number }>("/admin/summary", options);
}

// GET /admin/users
export async function getUsers(options: Cookie = {}) {
  const { users } = await request<{ users: AdminUserRow[] }>("/admin/users", options);
  return users;
}

// GET /admin/users/:id
export async function getUser(id: string, options: Cookie = {}) {
  return request<AdminUserDetail>(`/admin/users/${id}`, options);
}

// POST /admin/users（初期パスワードはこの応答でだけ受け取れる）
export async function createUser(body: { employeeNo: string; name: string; role: "user" | "admin" }) {
  return request<{ user: { id: string; employee_no: string; name: string; role: string }; initialPassword: string }>(
    "/admin/users",
    { method: "POST", body },
  );
}

// POST /admin/users/:id/reset-password
export async function resetPassword(id: string) {
  return request<{ employeeNo: string; initialPassword: string }>(`/admin/users/${id}/reset-password`, {
    method: "POST",
  });
}

// GET /admin/submissions?status=...
export async function getSubmissions(status: SubmissionStatus | undefined, options: Cookie = {}) {
  const query = status ? `?status=${status}` : "";
  const { submissions } = await request<{ submissions: AdminSubmissionRow[] }>(`/admin/submissions${query}`, options);
  return submissions;
}

// GET /admin/submissions/:id
export async function getSubmission(id: string, options: Cookie = {}) {
  const { submission } = await request<{ submission: AdminSubmissionDetail }>(`/admin/submissions/${id}`, options);
  return submission;
}

// POST /admin/submissions/:id/approve | reject
export async function reviewSubmission(id: string, decision: "approve" | "reject", comment: string) {
  return request<{ status: SubmissionStatus; lessonCompleted: boolean; unlocked: number | null }>(
    `/admin/submissions/${id}/${decision}`,
    { method: "POST", body: comment ? { comment } : {} },
  );
}

/* ---------- 講義（動画と資料の登録） ---------- */

export type AdminLectureRow = {
  id: number;
  chapter_id: number;
  chapter_title: string;
  section: string | null;
  title: string;
  has_video: boolean;
  has_material: boolean;
  updated_at: string;
  completed_count: number;
};

export type AdminLecture = {
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
};

// GET /admin/lectures
export async function getAdminLectures(options: Cookie = {}) {
  const { lectures } = await request<{ lectures: AdminLectureRow[] }>("/admin/lectures", options);
  return lectures;
}

// GET /admin/lectures/:id
export async function getAdminLecture(id: number, options: Cookie = {}) {
  const { lecture } = await request<{ lecture: AdminLecture }>(`/admin/lectures/${id}`, options);
  return lecture;
}

// PUT /admin/lectures/:id（空にすると未登録に戻る）
export async function updateLecture(id: number, body: { videoUrl: string; materialMd: string }) {
  return request<{ lecture: { id: number; updated_at: string } }>(`/admin/lectures/${id}`, { method: "PUT", body });
}
