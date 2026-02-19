import { z } from "zod";

export const authInputSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
});

export type AuthInput = z.infer<typeof authInputSchema>;
