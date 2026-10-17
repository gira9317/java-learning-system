import { z } from "zod";

export const lectureIdSchema = z.coerce.number().int().positive();

export const lectureProgressSchema = z.object({
  completed: z.boolean(),
});

// 空文字は「未登録に戻す」として null にする
const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export const updateLectureSchema = z.object({
  videoUrl: z.preprocess(
    emptyToNull,
    z
      .url({ protocol: /^https$/, error: "動画の URL は https:// で始まる URL にしてください" })
      .max(2000)
      .nullable(),
  ),
  materialMd: z.preprocess(emptyToNull, z.string().max(200_000, "資料が長すぎます").nullable()),
});
