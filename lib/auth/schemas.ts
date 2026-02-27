import { z } from "zod";
import { getPasswordPolicyErrorMessage } from "@/lib/auth/password-policy";

const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("有効なメールアドレスを入力してください")
  .max(
    MAX_EMAIL_LENGTH,
    `メールアドレスは${MAX_EMAIL_LENGTH}文字以内で入力してください`,
  );

export const signupInputSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .max(
      MAX_PASSWORD_LENGTH,
      `パスワードは${MAX_PASSWORD_LENGTH}文字以内で入力してください`,
    )
    .superRefine((value, context) => {
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
  password: z
    .string()
    .min(1, "パスワードを入力してください")
    .max(
      MAX_PASSWORD_LENGTH,
      `パスワードは${MAX_PASSWORD_LENGTH}文字以内で入力してください`,
    ),
});

export const authInputSchema = signupInputSchema;

export type SignupInput = z.infer<typeof signupInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type AuthInput = z.infer<typeof authInputSchema>;
