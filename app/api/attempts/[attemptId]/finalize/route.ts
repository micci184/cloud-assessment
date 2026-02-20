import { NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/auth/guards";
import { isValidOrigin } from "@/lib/auth/origin";
import { messageResponse, internalServerErrorResponse } from "@/lib/auth/http";
import { prisma } from "@/lib/db/prisma";
import {
  createAttemptFinalizedEvent,
  logAttemptFinalizedEvent,
} from "@/lib/logging/attempt-events";
import { deliverAttemptResultToNotion } from "@/lib/notion/delivery";
import { calculateScore } from "@/lib/quiz/scoring";

type RouteContext = {
  params: Promise<{ attemptId: string }>;
};

export const POST = async (
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
          include: {
            question: { select: { category: true, answerIndex: true } },
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

    if (attempt.status === "COMPLETED") {
      return messageResponse("この試験は既に採点済みです", 400);
    }

    const unanswered = attempt.questions.filter(
      (aq) => aq.selectedIndex === null,
    );

    if (unanswered.length > 0) {
      return messageResponse(
        `未回答の問題が${unanswered.length}件あります`,
        400,
      );
    }

    const scoringData = attempt.questions.map((aq) => ({
      isCorrect: aq.isCorrect,
      category: aq.question.category,
    }));

    const { overallPercent, categoryBreakdown } = calculateScore(scoringData);
    const completedAt = new Date();

    const result = await prisma.$transaction(async (tx) => {
      await tx.attempt.update({
        where: { id: attemptId },
        data: {
          status: "COMPLETED",
          completedAt,
        },
      });

      return tx.result.create({
        data: {
          attemptId,
          overallPercent,
          categoryBreakdown,
        },
      });
    });

    const finalizedEvent = createAttemptFinalizedEvent({
      attemptId,
      userId: attempt.userId,
      overallPercent: result.overallPercent,
      categoryBreakdown,
    });
    logAttemptFinalizedEvent(finalizedEvent);

    const notionDelivery = await deliverAttemptResultToNotion({
      attemptId,
      userId: attempt.userId,
      status: "COMPLETED",
      startedAt: attempt.startedAt,
      completedAt,
      overallPercent: result.overallPercent,
      categoryBreakdown,
    });
    console.info(
      JSON.stringify({
        eventType: "notion_delivery_result",
        attemptId,
        status: notionDelivery.status,
        ...(notionDelivery.status === "sent"
          ? {
              attempts: notionDelivery.attempts,
              duplicate: notionDelivery.duplicate,
            }
          : notionDelivery.status === "failed"
            ? {
                attempts: notionDelivery.attempts,
                errorMessage: notionDelivery.errorMessage,
              }
            : { reason: notionDelivery.reason }),
      }),
    );

    return NextResponse.json({
      overallPercent: result.overallPercent,
      categoryBreakdown: result.categoryBreakdown,
    });
  } catch (error) {
    return internalServerErrorResponse(error);
  }
};
