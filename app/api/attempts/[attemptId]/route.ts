import { NextResponse } from "next/server";

import { attemptParamsSchema } from "@/lib/attempt/schemas";
import { getUserFromRequest } from "@/lib/auth/guards";
import { messageResponse, internalServerErrorResponse } from "@/lib/auth/http";
import { prisma } from "@/lib/db/prisma";
import {
  parseCategoryBreakdown,
  parseChoiceOrder,
  parsePrimaryQuestionIndex,
  parseQuestionIndices,
  parseQuestionChoices,
} from "@/lib/quiz/parsers";

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
                questionType: true,
                questionText: true,
                choices: true,
                answerIndices: true,
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

    const questions = attempt.questions.map((aq) => {
      const parsedChoices = parseQuestionChoices(aq.question.choices);
      const parsedAnswerIndices = parseQuestionIndices(
        aq.question.answerIndices,
        parsedChoices.length,
      );
      const answerIndices =
        parsedAnswerIndices.length > 0
          ? parsedAnswerIndices
          : [];
      const parsedSelectedIndices = parseQuestionIndices(
        aq.selectedIndices,
        parsedChoices.length,
      );
      const selectedIndices =
        parsedSelectedIndices.length > 0
          ? parsedSelectedIndices
            : null;
      const answerIndex = parsePrimaryQuestionIndex(
        aq.question.answerIndices,
        parsedChoices.length,
      );
      const selectedIndex = parsePrimaryQuestionIndex(
        aq.selectedIndices,
        parsedChoices.length,
      );

      return {
        attemptQuestionId: aq.id,
        order: aq.order,
        choiceOrder: parseChoiceOrder(aq.choiceOrder, parsedChoices.length),
        selectedIndex,
        selectedIndices,
        isCorrect: aq.isCorrect,
        answeredAt: aq.answeredAt,
        question: {
          id: aq.question.id,
          category: aq.question.category,
          level: aq.question.level,
          questionType: aq.question.questionType,
          questionText: aq.question.questionText,
          choices: parsedChoices,
          ...(attempt.status === "COMPLETED"
            ? {
                ...(answerIndex !== null ? { answerIndex } : {}),
                answerIndices,
                explanation: aq.question.explanation,
              }
            : {}),
        },
      };
    });

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
            categoryBreakdown: parseCategoryBreakdown(
              attempt.result.categoryBreakdown,
            ),
          }
        : null,
    });
  } catch (error) {
    return internalServerErrorResponse(error);
  }
};
