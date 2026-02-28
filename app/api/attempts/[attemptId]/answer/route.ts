import { NextResponse } from "next/server";

import { answerSchema, attemptParamsSchema } from "@/lib/attempt/schemas";
import {
  requireAuthenticatedUser,
  requireJsonContentType,
  requireValidOrigin,
} from "@/lib/api/guards";
import { messageResponse, internalServerErrorResponse } from "@/lib/auth/http";
import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{ attemptId: string }>;
};

export const POST = async (
  request: Request,
  context: RouteContext,
): Promise<NextResponse> => {
  try {
    const invalidOriginResponse = requireValidOrigin(request);
    if (invalidOriginResponse) {
      return invalidOriginResponse;
    }

    const invalidContentTypeResponse = requireJsonContentType(request);
    if (invalidContentTypeResponse) {
      return invalidContentTypeResponse;
    }

    const { user, response: unauthorizedResponse } =
      await requireAuthenticatedUser(request);
    if (unauthorizedResponse || !user) {
      return unauthorizedResponse ?? messageResponse("unauthorized", 401);
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
      select: { userId: true, status: true },
    });

    if (!attempt) {
      return messageResponse("attempt not found", 404);
    }

    if (attempt.userId !== user.id) {
      return messageResponse("forbidden", 403);
    }

    if (attempt.status === "COMPLETED") {
      return messageResponse("この試験は既に完了しています", 400);
    }

    const body: unknown = await request.json();
    const parsed = answerSchema.safeParse(body);

    if (!parsed.success) {
      return messageResponse(
        parsed.error.issues[0]?.message ?? "invalid input",
        400,
      );
    }

    const { attemptQuestionId, selectedIndex } = parsed.data;

    const attemptQuestion = await prisma.attemptQuestion.findUnique({
      where: { id: attemptQuestionId },
      include: {
        question: { select: { answerIndex: true } },
      },
    });

    if (!attemptQuestion || attemptQuestion.attemptId !== attemptId) {
      return messageResponse("question not found", 404);
    }

    if (attemptQuestion.selectedIndex !== null) {
      return messageResponse("この問題は既に回答済みです", 400);
    }

    const isCorrect = selectedIndex === attemptQuestion.question.answerIndex;

    const updated = await prisma.attemptQuestion.update({
      where: { id: attemptQuestionId },
      data: {
        selectedIndex,
        isCorrect,
        answeredAt: new Date(),
      },
    });

    return NextResponse.json({
      attemptQuestionId: updated.id,
      selectedIndex: updated.selectedIndex,
    });
  } catch (error) {
    return internalServerErrorResponse(error);
  }
};
