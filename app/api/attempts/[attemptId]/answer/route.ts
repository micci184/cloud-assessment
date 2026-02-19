import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/auth/guards";
import { isValidOrigin, isJsonContentType } from "@/lib/auth/origin";
import { messageResponse, internalServerErrorResponse } from "@/lib/auth/http";
import { prisma } from "@/lib/db/prisma";

const answerSchema = z.object({
  attemptQuestionId: z.string().min(1),
  selectedIndex: z.number().int().min(0).max(3),
});

type RouteContext = {
  params: Promise<{ attemptId: string }>;
};

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
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

    const { attemptId } = await context.params;

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
      isCorrect: updated.isCorrect,
    });
  } catch (error) {
    return internalServerErrorResponse(error);
  }
}
