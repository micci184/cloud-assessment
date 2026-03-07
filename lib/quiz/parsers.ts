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
const indicesSchema = z.array(z.number().int().nonnegative());

export const parseQuestionChoices = (value: unknown): string[] => {
  const parsed = choicesSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
};

export const parseChoiceOrder = (
  value: unknown,
  choicesCount: number,
): number[] => {
  const defaultOrder = Array.from({ length: choicesCount }, (_, index) => index);
  if (choicesCount === 0) {
    return [];
  }

  const parsed = z.array(z.number().int()).safeParse(value);
  if (!parsed.success || parsed.data.length !== choicesCount) {
    return defaultOrder;
  }

  const hasOutOfRange = parsed.data.some(
    (index) => index < 0 || index >= choicesCount,
  );
  if (hasOutOfRange) {
    return defaultOrder;
  }

  if (new Set(parsed.data).size !== choicesCount) {
    return defaultOrder;
  }

  return parsed.data;
};

export const parseQuestionIndices = (
  value: unknown,
  choicesCount: number,
): number[] => {
  if (choicesCount <= 0) {
    return [];
  }

  const parsed = indicesSchema.safeParse(value);
  if (!parsed.success || parsed.data.length === 0) {
    return [];
  }

  const hasOutOfRange = parsed.data.some(
    (index) => index < 0 || index >= choicesCount,
  );
  if (hasOutOfRange) {
    return [];
  }

  return [...new Set(parsed.data)].sort((a, b) => a - b);
};

export const parsePrimaryQuestionIndex = (
  value: unknown,
  choicesCount: number,
): number | null => {
  const indices = parseQuestionIndices(value, choicesCount);
  return indices[0] ?? null;
};

export const parseCategoryBreakdown = (value: unknown): CategoryScore[] => {
  const parsed = categoryBreakdownSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
};
