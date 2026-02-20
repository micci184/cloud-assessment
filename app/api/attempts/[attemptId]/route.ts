import { NextResponse } from "next/server";

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

    const { attemptId } = await context.params;

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

    const questions = attempt.questions.map((aq) => ({
      attemptQuestionId: aq.id,
      order: aq.order,
      selectedIndex: aq.selectedIndex,
      isCorrect: aq.isCorrect,
      answeredAt: aq.answeredAt,
      question: {
        id: aq.question.id,
        category: aq.question.category,
        level: aq.question.level,
        questionText: aq.question.questionText,
        choices: aq.question.choices,
        ...(attempt.status === "COMPLETED"
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
