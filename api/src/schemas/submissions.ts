import { z } from "zod";

// web/lib/flow.ts の FlowNode / FlowEdge と同じ形
const flowNodeSchema = z.object({
  id: z.string().min(1).max(20),
  type: z.enum(["start", "end", "process", "decision", "io"]),
  label: z.string().max(60),
  x: z.number().finite(),
  y: z.number().finite(),
});

const flowEdgeSchema = z.object({
  id: z.string().min(1).max(20),
  from: z.string().min(1).max(20),
  to: z.string().min(1).max(20),
  branch: z.enum(["true", "false"]).optional(),
});

// 自動採点の結果は参考として保存するだけなので、形は緩く受ける
const autoResultsSchema = z.array(z.looseObject({})).max(50).optional();

export const flowContentSchema = z.object({
  nodes: z.array(flowNodeSchema).max(100),
  edges: z.array(flowEdgeSchema).max(200),
});

/**
 * Main.java 以外のソースファイル（複数ファイルのレッスンだけで使う）。フォルダは Java の package として扱う。
 * 実行サーバー（runner/src/sandbox.ts の SOURCE_PATH）と同じ規則。英数字・アンダースコア・スラッシュだけを許す。
 */
export const SOURCE_PATH = /^(?:[a-z][a-z0-9_]{0,29}\/){0,3}[A-Z][A-Za-z0-9_]{0,59}\.java$/;
export const MAX_FILES = 30;
export const filesSchema = z
  .array(
    z.object({
      path: z.string().regex(SOURCE_PATH, "ファイル名が正しくありません").refine((p) => p !== "Main.java", "Main.java は別に送ります"),
      content: z.string().max(20_000),
    }),
  )
  .max(MAX_FILES)
  .refine((files) => new Set(files.map((f) => f.path.toLowerCase())).size === files.length, "同じ名前のファイルがあります")
  .refine((files) => files.reduce((n, f) => n + f.content.length, 0) <= 100_000, "ファイルが大きすぎます");

// code は Main.java の中身。files はそれ以外のファイル（既存の提出・下書きは code だけ）
const codeContentSchema = z.object({
  code: z.string().max(20_000),
  files: filesSchema.optional(),
});

export const createSubmissionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("flow"),
    content: flowContentSchema,
    autoResults: autoResultsSchema,
  }),
  z.object({
    kind: z.literal("code"),
    // 提出するコードは空にできない
    content: z.object({ code: codeContentSchema.shape.code.min(1), files: filesSchema.optional() }),
    autoResults: autoResultsSchema,
  }),
]);

// 「実行」ボタン: コマンドライン引数と標準入力を指定して 1 回動かす
export const runCodeSchema = z.object({
  code: z.string().min(1).max(20_000),
  files: filesSchema.default([]),
  args: z.array(z.string().max(200)).max(40).default([]),
  stdin: z.string().max(10_000).default(""),
});

// 「採点する」ボタン
export const gradeCodeSchema = z.object({
  code: z.string().min(1).max(20_000),
  files: filesSchema.default([]),
});

// 対話型の実行: 始める（コンパイルして起動）と、1 行ずつの入力
export const sessionStartSchema = gradeCodeSchema;
export const sessionInputSchema = z.object({ line: z.string().max(1000) });
export const sessionIdSchema = z.uuid();

// 下書き（作業途中）。形は提出と同じで、コードは空でもよい
export const draftKindSchema = z.enum(["flow", "code"]);
export const draftContentSchemas = { flow: flowContentSchema, code: codeContentSchema } as const;

export const approveSchema = z.object({
  comment: z.string().trim().max(2000).optional(),
});

export const rejectSchema = z.object({
  comment: z.string({ error: "差し戻しの理由を入力してください" }).trim().min(1, "差し戻しの理由を入力してください").max(2000),
});

export const submissionListQuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});
