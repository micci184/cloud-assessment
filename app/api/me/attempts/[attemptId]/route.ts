import { NextResponse } from "next/server";

import { attemptParamsSchema } from "@/lib/attempt/schemas";
import { getUserFromRequest } from "@/lib/auth/guards";
import { messageResponse, internalServerErrorResponse } from "@/lib/auth/http";
import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{ attemptId: string }>;
};

export const GET = async (
  request: Request,
  context: RouteContext,
): Promise<NextResponse> => {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return messageResponse("unauthorized", 401);
    }

    const params = await context.params;
    const parsedParams = attemptParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      return messageResponse(
        parsedParams.error.issues[0]?.message ?? "invalid attemptId",
        400,
      );
    }
    const { attemptId } = parsedParams.data;

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: {
            question: {
              select: {
                id: true,
                category: true,
                level: true,
                questionText: true,
                choices: true,
                answerIndex: true,
                explanation: true,
              },
            },
          },
        },
        result: true,
      },
    });

    if (!attempt) {
      return messageResponse("attempt not found", 404);
    }

    if (attempt.userId !== user.id) {
      return messageResponse("forbidden", 403);
    }

    const isCompleted = attempt.status === "COMPLETED";

    const questions = attempt.questions.map((aq) => ({
      attemptQuestionId: aq.id,
      order: aq.order,
      selectedIndex: aq.selectedIndex,
      isCorrect: isCompleted ? aq.isCorrect : null,
      question: {
        id: aq.question.id,
        category: aq.question.category,
        level: aq.question.level,
        questionText: aq.question.questionText,
        choices: aq.question.choices,
        ...(isCompleted
          ? {
              answerIndex: aq.question.answerIndex,
              explanation: aq.question.explanation,
            }
          : {}),
      },
    }));

    return NextResponse.json({
      id: attempt.id,
      status: attempt.status,
      filters: attempt.filters,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      questions,
      result: attempt.result
        ? {
            overallPercent: attempt.result.overallPercent,
            categoryBreakdown: attempt.result.categoryBreakdown,
          }
        : null,
    });
  } catch (error) {
    return internalServerErrorResponse(error);
  }
};
