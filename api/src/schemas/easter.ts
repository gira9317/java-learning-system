import { z } from "zod";

export const flagSchema = z.object({
  flag: z.string().trim().min(1, "フラグを入力してください").max(100),
});
