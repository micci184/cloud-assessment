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

type CandidateQuestion = {
  id: string;
  choices: unknown;
};

const weightedPickWithoutReplacement = (
  candidates: CandidateQuestion[],
  weightsByQuestionId: Map<string, number>,
  count: number,
): CandidateQuestion[] => {
  const pool = [...candidates];
  const selected: CandidateQuestion[] = [];

  while (selected.length < count && pool.length > 0) {
    const poolWithWeights = pool.map((question) => ({
      question,
      weight: Math.max(0, weightsByQuestionId.get(question.id) ?? 1),
    }));
    const totalWeight = poolWithWeights.reduce((sum, item) => sum + item.weight, 0);

    let pickedIndex = 0;

    if (totalWeight > 0) {
      let threshold = Math.random() * totalWeight;
      for (let index = 0; index < poolWithWeights.length; index += 1) {
        threshold -= poolWithWeights[index]?.weight ?? 0;
        if (threshold <= 0) {
          pickedIndex = index;
          break;
        }
      }
    } else {
      pickedIndex = Math.floor(Math.random() * pool.length);
    }

    const picked = pool.splice(pickedIndex, 1)[0];
    if (picked) {
      selected.push(picked);
    }
  }

  return selected;
};

const selectQuestionsByWeakpoint = async (
  userId: string,
  candidates: CandidateQuestion[],
  count: number,
): Promise<CandidateQuestion[]> => {
  const candidateIds = candidates.map((question) => question.id);
  const [attemptTotals, correctTotals] = await Promise.all([
    prisma.attemptQuestion.groupBy({
      by: ["questionId"],
      where: {
        questionId: { in: candidateIds },
        attempt: {
          userId,
          status: "COMPLETED",
        },
      },
      _count: { _all: true },
    }),
    prisma.attemptQuestion.groupBy({
      by: ["questionId"],
      where: {
        questionId: { in: candidateIds },
        isCorrect: true,
        attempt: {
          userId,
          status: "COMPLETED",
        },
      },
      _count: { _all: true },
    }),
  ]);

  const totalMap = new Map(
    attemptTotals.map((item) => [item.questionId, item._count._all]),
  );
  const correctMap = new Map(
    correctTotals.map((item) => [item.questionId, item._count._all]),
  );
  const weightsByQuestionId = new Map<string, number>();

  for (const candidate of candidates) {
    const total = totalMap.get(candidate.id) ?? 0;
    const correct = correctMap.get(candidate.id) ?? 0;
    if (total === 0) {
      weightsByQuestionId.set(candidate.id, 1.0);
      continue;
    }

    const accuracy = correct / total;
    const weight = Math.max(0.1, 1 - accuracy);
    weightsByQuestionId.set(candidate.id, weight);
  }

  return weightedPickWithoutReplacement(candidates, weightsByQuestionId, count);
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

    const { categories, level, count, mode } = parsed.data;

    const questions = await prisma.question.findMany({
      where: {
        category: { in: categories },
        level,
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

    const selected =
      mode === "weakpoint"
        ? await selectQuestionsByWeakpoint(user.id, questions, count)
        : shuffleInPlace(questions).slice(0, count);

    const attempt = await prisma.$transaction(async (tx) => {
      const newAttempt = await tx.attempt.create({
        data: {
          userId: user.id,
          filters: { categories, level, count, mode },
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
