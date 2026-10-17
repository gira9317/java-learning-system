import type { FlowEdge, FlowNode } from "@/lib/flow";
import { request } from "./client";

export type SubmissionKind = "flow" | "code";
export type SubmissionStatus = "pending" | "approved" | "rejected";
/** none = まだ提出していない */
export type StageStatus = "none" | SubmissionStatus;

export type FlowContent = { nodes: FlowNode[]; edges: FlowEdge[] };
export type CodeContent = { code: string };

export type Submission = {
  id: string;
  question_no: number;
  kind: SubmissionKind;
  content: FlowContent | CodeContent;
  auto_results: Record<string, unknown>[] | null;
  status: SubmissionStatus;
  review_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type Stage = { status: StageStatus; canSubmit: boolean };

/** 作業途中の内容（下書き） */
export type Draft<T> = { content: T; updated_at: string };

export type LessonSubmissions = {
  lessonStatus: "completed" | "in-progress" | "locked";
  flow: Stage;
  code: Stage;
  latest: { flow: Submission | null; code: Submission | null };
  drafts: { flow: Draft<FlowContent> | null; code: Draft<CodeContent> | null };
  history: Submission[];
};

// GET /lessons/:id/submissions（自分の提出の状況）
export async function getLessonSubmissions(lessonId: number, options: { cookie?: string; questionNo?: number } = {}) {
  return request<LessonSubmissions>(`/lessons/${lessonId}/submissions?question=${options.questionNo ?? 1}`, options);
}

// POST /lessons/:id/submissions
export async function submit(
  lessonId: number,
  body:
    | { kind: "flow"; content: FlowContent; autoResults?: Record<string, unknown>[] }
    | { kind: "code"; content: CodeContent; autoResults?: Record<string, unknown>[] },
  questionNo = 1,
) {
  return request<{ submission: Pick<Submission, "id" | "kind" | "status" | "created_at"> }>(
    `/lessons/${lessonId}/submissions?question=${questionNo}`,
    { method: "POST", body },
  );
}

// PUT /lessons/:id/drafts/:kind（下書きの保存。エディタが自動で呼ぶ）
export async function saveDraft(
  lessonId: number,
  kind: SubmissionKind,
  content: FlowContent | CodeContent,
  options: { keepalive?: boolean; questionNo?: number } = {},
) {
  return request<{ savedAt: string }>(`/lessons/${lessonId}/drafts/${kind}?question=${options.questionNo ?? 1}`, {
    method: "PUT",
    body: content,
    keepalive: options.keepalive,
  });
}

/* ---------- コードの実行・採点（実行サーバーで本当に動かす） ---------- */

export type CompileResult = { ok: boolean; output: string; durationMs: number };

export type RunCaseResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  truncated: boolean;
  durationMs: number;
};

export type GradeCaseResult = {
  input: string;
  expected: string;
  actual: string;
  ok: boolean;
  label: string | null;
  hidden: boolean;
  error: string | null;
};

// POST /lessons/:id/run（コマンドライン引数と標準入力を指定して 1 回動かす）
export async function runCode(lessonId: number, body: { code: string; args: string[]; stdin: string }, questionNo = 1) {
  return request<{ compile: CompileResult; result: RunCaseResult | null }>(`/lessons/${lessonId}/run?question=${questionNo}`, {
    method: "POST",
    body,
  });
}

// POST /lessons/:id/grade（レッスンのテストケースで採点する）
export async function gradeCode(lessonId: number, code: string, questionNo = 1) {
  return request<{ compile: CompileResult; results: GradeCaseResult[] }>(`/lessons/${lessonId}/grade?question=${questionNo}`, {
    method: "POST",
    body: { code },
  });
}
