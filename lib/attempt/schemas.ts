import { z } from "zod";

export const DEFAULT_ATTEMPTS_PAGE_SIZE = 10;
export const MAX_ATTEMPTS_PAGE_SIZE = 50;

export const attemptIdSchema = z
  .string()
  .min(1, "attemptId is required")
  .max(100, "attemptId is too long");

export const attemptParamsSchema = z.object({
  attemptId: attemptIdSchema,
});

export const createAttemptSchema = z.object({
  categories: z
    .array(z.string().min(1).max(200, "カテゴリ名が長すぎます"))
    .min(1, "カテゴリを1つ以上選択してください")
    .max(100, "カテゴリ数が多すぎます"),
  level: z.number().int().min(1).max(3),
  count: z.number().int().min(1).max(50),
});

export const answerSchema = z.object({
  attemptQuestionId: z.string().min(1).max(100, "attemptQuestionId is too long"),
  selectedIndex: z.number().int().min(0).max(3),
});

export const attemptsQuerySchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((value) => value >= 1)
    .optional(),
  pageSize: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((value) => value >= 1 && value <= MAX_ATTEMPTS_PAGE_SIZE)
    .optional(),
});
