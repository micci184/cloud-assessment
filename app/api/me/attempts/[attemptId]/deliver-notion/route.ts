import { NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/auth/guards";
import { internalServerErrorResponse, messageResponse } from "@/lib/auth/http";
import { isValidOrigin } from "@/lib/auth/origin";
import { deliverAttemptResultToNotion } from "@/lib/notion/delivery";
import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{ attemptId: string }>;
};

const POST = async (
  request: Request,
  context: RouteContext,
): Promise<NextResponse> => {
  try {
    if (!isValidOrigin(request)) {
      return messageResponse("invalid origin", 403);
    }

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
        result: {
          select: {
            overallPercent: true,
            categoryBreakdown: true,
          },
        },
      },
    });

    if (!attempt) {
      return messageResponse("attempt not found", 404);
    }

    if (attempt.userId !== user.id) {
      return messageResponse("forbidden", 403);
    }

    if (attempt.status !== "COMPLETED" || !attempt.result) {
      return messageResponse("attempt must be completed before delivery", 400);
    }

    const filterCategories = (() => {
      const rawFilters = attempt.filters as { categories?: unknown } | null;
      if (!rawFilters || !Array.isArray(rawFilters.categories)) {
        return [] as string[];
      }

      return rawFilters.categories.filter(
        (category): category is string => typeof category === "string" && category.length > 0,
      );
    })();

    const deliveryResult = await deliverAttemptResultToNotion({
      attemptId: attempt.id,
      userId: attempt.userId,
      status: attempt.status,
      createdAt: attempt.createdAt,
      updatedAt: attempt.updatedAt,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      categories: filterCategories,
      overallPercent: attempt.result.overallPercent,
      categoryBreakdown: attempt.result.categoryBreakdown as Array<{
        category: string;
        total: number;
        correct: number;
        percent: number;
      }>,
      questions: attempt.questions.map((question) => ({
        order: question.order,
        category: question.question.category,
        level: question.question.level,
        questionText: question.question.questionText,
        choices: question.question.choices as string[],
        answerIndex: question.question.answerIndex,
        selectedIndex: question.selectedIndex,
        isCorrect: question.isCorrect,
        explanation: question.question.explanation,
      })),
      source: "app",
    });

    if (deliveryResult.status === "failed") {
      return NextResponse.json(deliveryResult, { status: 502 });
    }

    return NextResponse.json(deliveryResult, { status: 200 });
  } catch (error: unknown) {
    return internalServerErrorResponse(error);
  }
};

export { POST };
