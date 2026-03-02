import { z } from "zod";

import type { CategoryScore } from "@/lib/quiz/types";

const choicesSchema = z.array(z.string());

const categoryScoreSchema = z.object({
  category: z.string(),
  total: z.number(),
  correct: z.number(),
  percent: z.number(),
});

const categoryBreakdownSchema = z.array(categoryScoreSchema);

export const parseQuestionChoices = (value: unknown): string[] => {
  const parsed = choicesSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
};

export const parseCategoryBreakdown = (value: unknown): CategoryScore[] => {
  const parsed = categoryBreakdownSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
};
