import { z } from "zod";
import { getPasswordPolicyErrorMessage } from "@/lib/auth/password-policy";

const emailSchema = z.email().trim().toLowerCase();

export const signupInputSchema = z.object({
  email: emailSchema,
  password: z.string().superRefine((value, context) => {
    const errorMessage = getPasswordPolicyErrorMessage(value);

    if (errorMessage) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: errorMessage,
      });
    }
  }),
});

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "パスワードを入力してください"),
});

export const authInputSchema = signupInputSchema;

export type SignupInput = z.infer<typeof signupInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type AuthInput = z.infer<typeof authInputSchema>;
