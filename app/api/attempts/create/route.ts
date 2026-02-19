import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/auth/guards";
import { isValidOrigin, isJsonContentType } from "@/lib/auth/origin";
import { messageResponse, internalServerErrorResponse } from "@/lib/auth/http";
import { prisma } from "@/lib/db/prisma";

const createAttemptSchema = z.object({
  categories: z
    .array(z.string().min(1))
    .min(1, "カテゴリを1つ以上選択してください"),
  level: z.number().int().min(1).max(3),
  count: z.number().int().min(1).max(50),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    if (!isValidOrigin(request)) {
      return messageResponse("invalid origin", 403);
    }

    if (!isJsonContentType(request)) {
      return messageResponse("content-type must be application/json", 415);
    }

    const user = await getUserFromRequest(request);

    if (!user) {
      return messageResponse("unauthorized", 401);
    }

    const body: unknown = await request.json();
    const parsed = createAttemptSchema.safeParse(body);

    if (!parsed.success) {
      return messageResponse(
        parsed.error.issues[0]?.message ?? "invalid input",
        400,
      );
    }

    const { categories, level, count } = parsed.data;

    const questions = await prisma.question.findMany({
      where: {
        category: { in: categories },
        level,
      },
      select: { id: true },
    });

    if (questions.length < count) {
      return messageResponse(
        `条件に合う問題が${questions.length}件しかありません（${count}件必要）`,
        400,
      );
    }

    const shuffled = questions.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    const attempt = await prisma.$transaction(async (tx) => {
      const newAttempt = await tx.attempt.create({
        data: {
          userId: user.id,
          filters: { categories, level, count },
        },
      });

      await tx.attemptQuestion.createMany({
        data: selected.map((question, index) => ({
          attemptId: newAttempt.id,
          questionId: question.id,
          order: index + 1,
        })),
      });

      return newAttempt;
    });

    return NextResponse.json({ attemptId: attempt.id }, { status: 201 });
  } catch (error) {
    return internalServerErrorResponse(error);
  }
}
