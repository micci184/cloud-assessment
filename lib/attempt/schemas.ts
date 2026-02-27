import { z } from "zod";

export const attemptIdSchema = z
  .string()
  .min(1, "attemptId is required")
  .max(100, "attemptId is too long");

export const attemptParamsSchema = z.object({
  attemptId: attemptIdSchema,
});
