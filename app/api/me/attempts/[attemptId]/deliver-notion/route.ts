import { NextResponse } from "next/server";
import { NotionDeliveryJobStatus, Prisma } from "@prisma/client";

import {
  requireAuthenticatedUser,
  requireAuthenticatedWriteRateLimit,
  requireValidOrigin,
} from "@/lib/api/guards";
import { attemptParamsSchema } from "@/lib/attempt/schemas";
import { internalServerErrorResponse, messageResponse } from "@/lib/auth/http";
import { prisma } from "@/lib/db/prisma";
import {
  deliverAttemptResultToNotionDetailed,
  type NotionDeliveryDetailedResult,
  type NotionDeliveryInput,
} from "@/lib/notion/delivery";
import { runNotionDeliveryJob } from "@/lib/notion/job";
import { parseQuestionIndices, parseQuestionChoices } from "@/lib/quiz/parsers";

type RouteContext = {
  params: Promise<{ attemptId: string }>;
};

const ACTIVE_NOTION_JOB_STATUSES: NotionDeliveryJobStatus[] = [
  NotionDeliveryJobStatus.QUEUED,
  NotionDeliveryJobStatus.IN_PROGRESS,
];

const getNotionDeliveryJobDelegate = () => {
  const delegate = prisma.notionDeliveryJob;
  if (delegate === undefined) {
    return null;
  }
  return delegate;
};

const findActiveNotionDeliveryJob = async (
  attemptId: string,
  userId: string,
) => {
  const notionDeliveryJob = getNotionDeliveryJobDelegate();
  if (!notionDeliveryJob) {
    return null;
  }

  return notionDeliveryJob.findFirst({
    where: {
      attemptId,
      userId,
      status: {
        in: ACTIVE_NOTION_JOB_STATUSES,
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
};

const findLatestNotionDeliveryJob = async (
  attemptId: string,
  userId: string,
) => {
  const notionDeliveryJob = getNotionDeliveryJobDelegate();
  if (!notionDeliveryJob) {
    return null;
  }

  return notionDeliveryJob.findFirst({
    where: {
      attemptId,
      userId,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
};

const buildDeliveryInput = (
  attempt: {
    id: string;
    status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    questions: Array<{
      selectedIndices: unknown;
      isCorrect: boolean | null;
      question: {
        category: string;
        level: number;
        questionText: string;
        choices: unknown;
        answerIndices: unknown;
        explanation: string;
      };
    }>;
  },
): NotionDeliveryInput => {
  return {
    attemptId: attempt.id,
    status: attempt.status,
    questions: attempt.questions.map((question) => {
      const validatedChoices = parseQuestionChoices(question.question.choices);
      const choiceCount = validatedChoices.length;

      return {
        category: question.question.category,
        level: question.question.level,
        questionText: question.question.questionText,
        choices: validatedChoices,
        answerIndices: parseQuestionIndices(
          question.question.answerIndices,
          choiceCount,
        ),
        selectedIndices: parseQuestionIndices(question.selectedIndices, choiceCount),
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
    const parsedLevel = Number.parseInt(String(typedItem.level ?? ""), 10);
    serialized.push({
      category: String(typedItem.category ?? ""),
      level: Number.isFinite(parsedLevel) ? parsedLevel : 0,
      questionText: String(typedItem.questionText ?? ""),
      errorMessage: String(typedItem.errorMessage ?? ""),
    });
  }

  return serialized;
};

type DeliveryJobSnapshot = {
  id: string;
  totalQuestions: number;
  processedQuestions: number;
  successQuestions: number;
  failedQuestions: number;
  duplicateDetected: boolean;
  lastError: string | null;
};

const toDeliveryJobSnapshot = (job: DeliveryJobSnapshot): DeliveryJobSnapshot => {
  return {
    id: job.id,
    totalQuestions: job.totalQuestions,
    processedQuestions: job.processedQuestions,
    successQuestions: job.successQuestions,
    failedQuestions: job.failedQuestions,
    duplicateDetected: job.duplicateDetected,
    lastError: job.lastError,
  };
};

const normalizeJobStatus = (status: NotionDeliveryJobStatus): string => {
  if (status === NotionDeliveryJobStatus.COMPLETED_WITH_ERRORS) {
    return "failed";
  }
  return status.toLowerCase();
};

const buildFallbackDeliveryResponse = (
  deliveryResult: NotionDeliveryDetailedResult,
): NextResponse => {
  const buildFallbackSnapshot = (): DeliveryJobSnapshot => {
    if (deliveryResult.status === "skipped") {
      return {
        id: "",
        totalQuestions: 0,
        processedQuestions: 0,
        successQuestions: 0,
        failedQuestions: 0,
        duplicateDetected: false,
        lastError: null,
      };
    }

    return {
      id: "",
      totalQuestions: deliveryResult.totalQuestions,
      processedQuestions: deliveryResult.processedQuestions,
      successQuestions: deliveryResult.successQuestions,
      failedQuestions: deliveryResult.failedQuestions,
      duplicateDetected: deliveryResult.duplicate,
      lastError:
        deliveryResult.status === "failed"
          ? deliveryResult.errorMessage
          : deliveryResult.failures[0]?.errorMessage ?? null,
    };
  };

  const job = buildFallbackSnapshot();

  if (deliveryResult.status === "completed") {
    return NextResponse.json(
      {
        status: "completed",
        message: deliveryResult.duplicate
          ? "already delivered"
          : "notion delivery completed",
        job,
      },
      { status: 200 },
    );
  }

  if (deliveryResult.status === "completed_with_errors") {
    return NextResponse.json(
      {
        status: "failed",
        message: `partial failure: ${deliveryResult.failedQuestions} items failed`,
        job,
      },
      { status: 502 },
    );
  }

  if (deliveryResult.status === "failed") {
    return NextResponse.json(
      {
        status: "failed",
        message: deliveryResult.errorMessage,
        job,
      },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      status: "failed",
      message: "missing notion config",
      job,
    },
    { status: 502 },
  );
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
    const invalidOriginResponse = requireValidOrigin(request);
    if (invalidOriginResponse) {
      return invalidOriginResponse;
    }

    const { user, response: unauthorizedResponse } =
      await requireAuthenticatedUser(request);
    if (unauthorizedResponse || !user) {
      return unauthorizedResponse ?? messageResponse("unauthorized", 401);
    }
    const rateLimitResponse = requireAuthenticatedWriteRateLimit(request, user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const rawParams = await context.params;
    const parsedParams = attemptParamsSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return messageResponse("invalid attempt id", 400);
    }

    const { attemptId } = parsedParams.data;
    const notionDeliveryJob = getNotionDeliveryJobDelegate();

    const { attempt, errorResponse } = await loadAttemptForDelivery(attemptId, user.id);
    if (errorResponse || !attempt) {
      return errorResponse ?? messageResponse("attempt not found", 404);
    }

    if (!notionDeliveryJob) {
      const input = buildDeliveryInput(attempt);
      const deliveryResult = await deliverAttemptResultToNotionDetailed(input);
      return buildFallbackDeliveryResponse(deliveryResult);
    }

    const existingJob = await findActiveNotionDeliveryJob(attempt.id, user.id);

    if (existingJob) {
      return NextResponse.json(
        {
          status: normalizeJobStatus(existingJob.status),
          job: toDeliveryJobSnapshot(existingJob),
        },
        { status: 202 },
      );
    }

    let job: Awaited<ReturnType<typeof notionDeliveryJob.create>>;
    try {
      job = await notionDeliveryJob.create({
        data: {
          attemptId: attempt.id,
          userId: user.id,
          status: NotionDeliveryJobStatus.QUEUED,
          totalQuestions: attempt.questions.length,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const concurrentJob =
          (await findActiveNotionDeliveryJob(attempt.id, user.id)) ??
          (await findLatestNotionDeliveryJob(attempt.id, user.id));
        if (concurrentJob) {
          return NextResponse.json(
            {
              status: normalizeJobStatus(concurrentJob.status),
              job: toDeliveryJobSnapshot(concurrentJob),
            },
            { status: 202 },
          );
        }
      }
      throw error;
    }

    const input = buildDeliveryInput(attempt);
    void runNotionDeliveryJob(job.id, input);

    return NextResponse.json(
      {
        status: "queued",
        job: toDeliveryJobSnapshot(job),
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
    const { user, response: unauthorizedResponse } =
      await requireAuthenticatedUser(request);
    if (unauthorizedResponse || !user) {
      return unauthorizedResponse ?? messageResponse("unauthorized", 401);
    }

    const rawParams = await context.params;
    const parsedParams = attemptParamsSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return messageResponse("invalid attempt id", 400);
    }
    const { attemptId } = parsedParams.data;
    const notionDeliveryJob = getNotionDeliveryJobDelegate();
    if (!notionDeliveryJob) {
      return NextResponse.json(
        {
          status: "idle",
          message:
            "notion delivery job model is unavailable. fallback mode is active for POST",
        },
        { status: 200 },
      );
    }

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

    const job = await notionDeliveryJob.findFirst({
      where: { attemptId, userId: user.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    if (!job) {
      return NextResponse.json({ status: "idle" }, { status: 200 });
    }

    const normalizedStatus = normalizeJobStatus(job.status);
    const message =
      job.status === NotionDeliveryJobStatus.COMPLETED_WITH_ERRORS
        ? `一部送信に失敗しました（失敗 ${job.failedQuestions} 件）`
        : null;
    const failedItems = serializeFailedItems(job.failedItems);
    return NextResponse.json(
      {
        status: normalizedStatus,
        message,
        job: {
          ...toDeliveryJobSnapshot(job),
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
