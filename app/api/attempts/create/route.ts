import { NextResponse } from "next/server";

import {
  requireAuthenticatedUser,
  requireJsonContentType,
  requireValidOrigin,
} from "@/lib/api/guards";
import { createAttemptSchema } from "@/lib/attempt/schemas";
import { messageResponse, internalServerErrorResponse } from "@/lib/auth/http";
import { prisma } from "@/lib/db/prisma";
import { parseQuestionChoices } from "@/lib/quiz/parsers";

const shuffleInPlace = <T>(items: T[]): T[] => {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
};

const buildChoiceOrder = (choicesCount: number): number[] => {
  if (choicesCount <= 0) {
    return [];
  }

  const indexes = Array.from({ length: choicesCount }, (_, index) => index);
  return shuffleInPlace(indexes);
};

export const POST = async (request: Request): Promise<NextResponse> => {
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

    const body: unknown = await request.json();
    const parsed = createAttemptSchema.safeParse(body);

    if (!parsed.success) {
      return messageResponse(
        parsed.error.issues[0]?.message ?? "invalid input",
        400,
      );
    }

    const {
      categories,
      level,
      levels,
      count,
      preset,
      platform: requestedPlatform,
      exam: requestedExam,
    } = parsed.data;
    const platform = preset === "cloud-practitioner" ? "AWS" : requestedPlatform;
    const exam = preset === "cloud-practitioner" ? "CP" : requestedExam;

    const questions = await prisma.question.findMany({
      where: {
        ...(platform ? { platform } : {}),
        ...(exam ? { exam } : {}),
        category: { in: categories },
        level: level !== undefined ? level : { in: levels ?? [] },
      },
      select: {
        id: true,
        choices: true,
      },
    });

    if (questions.length < count) {
      return messageResponse(
        `条件に合う問題が${questions.length}件しかありません（${count}件必要）`,
        400,
      );
    }

    const shuffled = shuffleInPlace(questions);
    const selected = shuffled.slice(0, count);

    const attempt = await prisma.$transaction(async (tx) => {
      const newAttempt = await tx.attempt.create({
        data: {
          userId: user.id,
          filters: {
            categories,
            count,
            ...(level !== undefined ? { level } : {}),
            ...(levels !== undefined ? { levels } : {}),
            ...(platform ? { platform } : {}),
            ...(exam ? { exam } : {}),
            ...(preset ? { preset } : {}),
          },
        },
      });

      await tx.attemptQuestion.createMany({
        data: selected.map((question, index) => ({
          attemptId: newAttempt.id,
          questionId: question.id,
          order: index + 1,
          choiceOrder: buildChoiceOrder(parseQuestionChoices(question.choices).length),
        })),
      });

      return newAttempt;
    });

    return NextResponse.json({ attemptId: attempt.id }, { status: 201 });
  } catch (error) {
    return internalServerErrorResponse(error);
  }
};
