import { z } from "zod";

export const lessonIdSchema = z.coerce.number().int().positive();

// locked は「前のレッスンが未完了」というサーバー側の判定なので、クライアントからは設定させない
export const updateProgressSchema = z.object({
  status: z.enum(["completed", "in-progress"]),
});
