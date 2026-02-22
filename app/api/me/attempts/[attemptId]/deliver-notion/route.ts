import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/auth/guards";
import { internalServerErrorResponse, messageResponse } from "@/lib/auth/http";
import { isValidOrigin } from "@/lib/auth/origin";
import { deliverAttemptResultToNotion } from "@/lib/notion/delivery";
import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{ attemptId: string }>;
};

const attemptParamsSchema = z.object({
  attemptId: z.string().min(1),
});

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

    const rawParams = await context.params;
    const parsedParams = attemptParamsSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return messageResponse("invalid attempt id", 400);
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

    if (attempt.status !== "COMPLETED" || !attempt.result) {
      return messageResponse("attempt must be completed before delivery", 400);
    }

    const deliveryResult = await deliverAttemptResultToNotion({
      attemptId: attempt.id,
      status: attempt.status,
      questions: attempt.questions.map((question) => {
        const validatedChoices =
          Array.isArray(question.question.choices) &&
          question.question.choices.every((choice) => typeof choice === "string")
            ? question.question.choices
            : [];

        return {
          category: question.question.category,
          level: question.question.level,
          questionText: question.question.questionText,
          choices: validatedChoices,
          answerIndex: question.question.answerIndex,
          selectedIndex: question.selectedIndex,
          isCorrect: question.isCorrect,
          explanation: question.question.explanation,
        };
      }),
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
