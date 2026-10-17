import { z } from "zod";
import { employeeNoSchema } from "./auth.js";

export const createUserSchema = z.object({
  employeeNo: employeeNoSchema,
  name: z.string().trim().min(1, "氏名を入力してください").max(50),
  role: z.enum(["user", "admin"]).default("user"),
});
