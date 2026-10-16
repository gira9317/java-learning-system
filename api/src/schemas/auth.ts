import { z } from "zod";

// 社員番号は前後の空白を除き、大文字に揃える（DB にも大文字で保存している）
export const employeeNoSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .transform((v) => v.toUpperCase());

export const loginSchema = z.object({
  employeeNo: employeeNoSchema,
  password: z.string().min(1).max(128),
  rememberMe: z.boolean().default(false),
});

// パスワードは 8 文字以上
export const PASSWORD_MIN = 8;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "現在のパスワードを入力してください"),
    newPassword: z.string().min(PASSWORD_MIN, `新しいパスワードは ${PASSWORD_MIN} 文字以上にしてください`).max(128),
  })
  .refine((b) => b.currentPassword !== b.newPassword, {
    path: ["newPassword"],
    message: "現在のパスワードとは別のものにしてください",
  });
