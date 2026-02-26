import { NextResponse } from "next/server";
import { NotionDeliveryJobStatus, Prisma } from "@prisma/client";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/auth/guards";
import { internalServerErrorResponse, messageResponse } from "@/lib/auth/http";
import { isValidOrigin } from "@/lib/auth/origin";
import { prisma } from "@/lib/db/prisma";
import { type NotionDeliveryInput } from "@/lib/notion/delivery";
import { runNotionDeliveryJob } from "@/lib/notion/job";

type RouteContext = {
  params: Promise<{ attemptId: string }>;
};

const attemptParamsSchema = z.object({
  attemptId: z.string().min(1),
});

const buildDeliveryInput = (
  attempt: {
    id: string;
    status: "IN_PROGRESS" | "COMPLETED";
    questions: Array<{
      selectedIndex: number | null;
      isCorrect: boolean | null;
      question: {
        category: string;
        level: number;
        questionText: string;
        choices: unknown;
        answerIndex: number;
        explanation: string;
      };
    }>;
  },
): NotionDeliveryInput => {
  return {
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
  };
};

const serializeFailedItems = (
  failedItems: Prisma.JsonValue | null,
): Array<{
  category: string;
  level: number;
  questionText: string;
  errorMessage: string;
}> => {
  if (!Array.isArray(failedItems)) {
    return [];
  }

  const serialized: Array<{
    category: string;
    level: number;
    questionText: string;
    errorMessage: string;
  }> = [];

  for (const item of failedItems) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const typedItem = item as Record<string, unknown>;
    serialized.push({
      category: String(typedItem.category ?? ""),
      level: Number(typedItem.level ?? 0),
      questionText: String(typedItem.questionText ?? ""),
      errorMessage: String(typedItem.errorMessage ?? ""),
    });
  }

  return serialized;
};

const loadAttemptForDelivery = async (
  attemptId: string,
  userId: string,
) => {
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
    return { errorResponse: messageResponse("attempt not found", 404), attempt: null };
  }

  if (attempt.userId !== userId) {
    return { errorResponse: messageResponse("forbidden", 403), attempt: null };
  }

  if (attempt.status !== "COMPLETED" || !attempt.result) {
    return {
      errorResponse: messageResponse("attempt must be completed before delivery", 400),
      attempt: null,
    };
  }

  return { errorResponse: null, attempt };
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

    const rawParams = await context.params;
    const parsedParams = attemptParamsSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return messageResponse("invalid attempt id", 400);
    }

    const { attemptId } = parsedParams.data;

    const { attempt, errorResponse } = await loadAttemptForDelivery(attemptId, user.id);
    if (errorResponse || !attempt) {
      return errorResponse ?? messageResponse("attempt not found", 404);
    }

    const existingJob = await prisma.notionDeliveryJob.findFirst({
      where: {
        attemptId: attempt.id,
        userId: user.id,
        status: {
          in: [NotionDeliveryJobStatus.QUEUED, NotionDeliveryJobStatus.IN_PROGRESS],
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    if (existingJob) {
      return NextResponse.json(
        {
          status: "in_progress",
          job: {
            id: existingJob.id,
            totalQuestions: existingJob.totalQuestions,
            processedQuestions: existingJob.processedQuestions,
            successQuestions: existingJob.successQuestions,
            failedQuestions: existingJob.failedQuestions,
            lastError: existingJob.lastError,
          },
        },
        { status: 202 },
      );
    }

    const job = await prisma.notionDeliveryJob.create({
      data: {
        attemptId: attempt.id,
        userId: user.id,
        status: NotionDeliveryJobStatus.QUEUED,
        totalQuestions: attempt.questions.length,
      },
    });

    const input = buildDeliveryInput(attempt);
    void runNotionDeliveryJob(job.id, input);

    return NextResponse.json(
      {
        status: "queued",
        job: {
          id: job.id,
          totalQuestions: job.totalQuestions,
          processedQuestions: job.processedQuestions,
          successQuestions: job.successQuestions,
          failedQuestions: job.failedQuestions,
          lastError: job.lastError,
        },
      },
      { status: 202 },
    );
  } catch (error: unknown) {
    return internalServerErrorResponse(error);
  }
};

const GET = async (
  request: Request,
  context: RouteContext,
): Promise<NextResponse> => {
  try {
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
      select: { id: true, userId: true },
    });
    if (!attempt) {
      return messageResponse("attempt not found", 404);
    }
    if (attempt.userId !== user.id) {
      return messageResponse("forbidden", 403);
    }

    const job = await prisma.notionDeliveryJob.findFirst({
      where: { attemptId, userId: user.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    if (!job) {
      return NextResponse.json({ status: "idle" }, { status: 200 });
    }

    const failedItems = serializeFailedItems(job.failedItems);
    return NextResponse.json(
      {
        status: job.status.toLowerCase(),
        job: {
          id: job.id,
          totalQuestions: job.totalQuestions,
          processedQuestions: job.processedQuestions,
          successQuestions: job.successQuestions,
          failedQuestions: job.failedQuestions,
          lastError: job.lastError,
          failedItems,
          startedAt: job.startedAt,
          finishedAt: job.finishedAt,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return internalServerErrorResponse(error);
  }
};

export { GET, POST };
