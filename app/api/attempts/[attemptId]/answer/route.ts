import { NextResponse } from "next/server";

import { answerSchema, attemptParamsSchema } from "@/lib/attempt/schemas";
import {
  requireAuthenticatedUser,
  requireJsonContentType,
  requireValidOrigin,
} from "@/lib/api/guards";
import { messageResponse, internalServerErrorResponse } from "@/lib/auth/http";
import { prisma } from "@/lib/db/prisma";
import { parseQuestionChoices, parseQuestionIndices } from "@/lib/quiz/parsers";

type RouteContext = {
  params: Promise<{ attemptId: string }>;
};

const isSingleQuestionType = (questionType: string): boolean => {
  return questionType === "SINGLE";
};

const areSameIndexSet = (left: number[], right: number[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
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

    const { attemptQuestionId, selectedIndex, selectedIndices } = parsed.data;

    const attemptQuestion = await prisma.attemptQuestion.findUnique({
      where: { id: attemptQuestionId },
      include: {
        question: {
          select: {
            answerIndex: true,
            answerIndices: true,
            questionType: true,
            choices: true,
          },
        },
      },
    });

    if (!attemptQuestion || attemptQuestion.attemptId !== attemptId) {
      return messageResponse("question not found", 404);
    }

    if (
      attemptQuestion.selectedIndex !== null ||
      attemptQuestion.selectedIndices !== null
    ) {
      return messageResponse("この問題は既に回答済みです", 400);
    }

    const parsedChoices = parseQuestionChoices(attemptQuestion.question.choices);
    const choiceCount = parsedChoices.length;
    if (choiceCount === 0) {
      return messageResponse("問題データが不正です", 400);
    }

    const normalizedCorrectIndices = parseQuestionIndices(
      attemptQuestion.question.answerIndices,
      choiceCount,
    );
    const correctIndices =
      normalizedCorrectIndices.length > 0
        ? normalizedCorrectIndices
        : [attemptQuestion.question.answerIndex];

    if (isSingleQuestionType(attemptQuestion.question.questionType)) {
      if (selectedIndex === undefined || selectedIndices !== undefined) {
        return messageResponse(
          "単一選択問題は selectedIndex を指定してください",
          400,
        );
      }

      if (selectedIndex < 0 || selectedIndex >= choiceCount) {
        return messageResponse("selectedIndex が不正です", 400);
      }

      const isCorrect = selectedIndex === attemptQuestion.question.answerIndex;
      const updated = await prisma.attemptQuestion.update({
        where: { id: attemptQuestionId },
        data: {
          selectedIndex,
          selectedIndices: [selectedIndex],
          isCorrect,
          answeredAt: new Date(),
        },
      });

      return NextResponse.json({
        attemptQuestionId: updated.id,
        selectedIndex: updated.selectedIndex,
        selectedIndices: [selectedIndex],
      });
    }

    if (selectedIndices === undefined || selectedIndex !== undefined) {
      return messageResponse(
        "複数選択問題は selectedIndices を指定してください",
        400,
      );
    }

    const normalizedSelectedIndices = parseQuestionIndices(
      selectedIndices,
      choiceCount,
    );
    if (normalizedSelectedIndices.length === 0) {
      return messageResponse("selectedIndices が不正です", 400);
    }

    if (normalizedSelectedIndices.length !== selectedIndices.length) {
      return messageResponse(
        "selectedIndices に重複または範囲外の値が含まれています",
        400,
      );
    }

    const isCorrect = areSameIndexSet(normalizedSelectedIndices, correctIndices);

    const updated = await prisma.attemptQuestion.update({
      where: { id: attemptQuestionId },
      data: {
        selectedIndex: null,
        selectedIndices: normalizedSelectedIndices,
        isCorrect,
        answeredAt: new Date(),
      },
    });

    return NextResponse.json({
      attemptQuestionId: updated.id,
      selectedIndex: updated.selectedIndex,
      selectedIndices: normalizedSelectedIndices,
    });
  } catch (error) {
    return internalServerErrorResponse(error);
  }
};
