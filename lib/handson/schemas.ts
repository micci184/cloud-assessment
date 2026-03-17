import { z } from "zod";

export const handsonSlugParamsSchema = z.object({
  slug: z.string().trim().min(1, "invalid slug").max(120, "invalid slug"),
});

export const completeStepSchema = z.object({
  stepIndex: z.number().int().min(0, "stepIndex must be >= 0"),
  totalSteps: z.number().int().min(1, "totalSteps must be >= 1"),
});
