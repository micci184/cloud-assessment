import { NextResponse } from "next/server";
import { NotionDeliveryJobStatus, Prisma } from "@prisma/client";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/auth/guards";
import { internalServerErrorResponse, messageResponse } from "@/lib/auth/http";
import { isValidOrigin } from "@/lib/auth/origin";
import { prisma } from "@/lib/db/prisma";
import {
  deliverAttemptResultToNotionDetailed,
  type NotionDeliveryInput,
} from "@/lib/notion/delivery";
import { runNotionDeliveryJob } from "@/lib/notion/job";

type RouteContext = {
  params: Promise<{ attemptId: string }>;
};

const attemptParamsSchema = z.object({
  attemptId: z.string().min(1),
});

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
    const notionDeliveryJob = getNotionDeliveryJobDelegate();

    const { attempt, errorResponse } = await loadAttemptForDelivery(attemptId, user.id);
    if (errorResponse || !attempt) {
      return errorResponse ?? messageResponse("attempt not found", 404);
    }

    // Fallback path: if Prisma Client does not include NotionDeliveryJob model yet,
    // deliver immediately instead of returning 503 to keep API usable.
    if (!notionDeliveryJob) {
      const input = buildDeliveryInput(attempt);
      const deliveryResult = await deliverAttemptResultToNotionDetailed(input);

      if (deliveryResult.status === "completed") {
        return NextResponse.json(
          {
            status: "completed",
            message: deliveryResult.duplicate
              ? "already delivered"
              : "notion delivery completed",
            job: {
              id: "",
              totalQuestions: deliveryResult.totalQuestions,
              processedQuestions: deliveryResult.processedQuestions,
              successQuestions: deliveryResult.successQuestions,
              failedQuestions: deliveryResult.failedQuestions,
              duplicateDetected: deliveryResult.duplicate,
              lastError: null,
            },
          },
          { status: 200 },
        );
      }

      if (deliveryResult.status === "completed_with_errors") {
        return NextResponse.json(
          {
            status: "failed",
            message: `partial failure: ${deliveryResult.failedQuestions} items failed`,
            job: {
              id: "",
              totalQuestions: deliveryResult.totalQuestions,
              processedQuestions: deliveryResult.processedQuestions,
              successQuestions: deliveryResult.successQuestions,
              failedQuestions: deliveryResult.failedQuestions,
              duplicateDetected: deliveryResult.duplicate,
              lastError: deliveryResult.failures[0]?.errorMessage ?? null,
            },
          },
          { status: 502 },
        );
      }

      if (deliveryResult.status === "failed") {
        return NextResponse.json(
          {
            status: "failed",
            message: deliveryResult.errorMessage,
            job: {
              id: "",
              totalQuestions: deliveryResult.totalQuestions,
              processedQuestions: deliveryResult.processedQuestions,
              successQuestions: deliveryResult.successQuestions,
              failedQuestions: deliveryResult.failedQuestions,
              duplicateDetected: deliveryResult.duplicate,
              lastError: deliveryResult.errorMessage,
            },
          },
          { status: 502 },
        );
      }

      return NextResponse.json(
        {
          status: "failed",
          message: "missing notion config",
        },
        { status: 502 },
      );
    }

    const existingJob = await findActiveNotionDeliveryJob(attempt.id, user.id);

    if (existingJob) {
      return NextResponse.json(
        {
          status: existingJob.status.toLowerCase(),
          job: {
            id: existingJob.id,
            totalQuestions: existingJob.totalQuestions,
            processedQuestions: existingJob.processedQuestions,
            successQuestions: existingJob.successQuestions,
            failedQuestions: existingJob.failedQuestions,
            duplicateDetected: existingJob.duplicateDetected,
            lastError: existingJob.lastError,
          },
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
        const concurrentJob = await findActiveNotionDeliveryJob(attempt.id, user.id);
        if (concurrentJob) {
          return NextResponse.json(
            {
              status: concurrentJob.status.toLowerCase(),
              job: {
                id: concurrentJob.id,
                totalQuestions: concurrentJob.totalQuestions,
                processedQuestions: concurrentJob.processedQuestions,
                successQuestions: concurrentJob.successQuestions,
                failedQuestions: concurrentJob.failedQuestions,
                duplicateDetected: concurrentJob.duplicateDetected,
                lastError: concurrentJob.lastError,
              },
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
        job: {
          id: job.id,
          totalQuestions: job.totalQuestions,
          processedQuestions: job.processedQuestions,
          successQuestions: job.successQuestions,
          failedQuestions: job.failedQuestions,
          duplicateDetected: job.duplicateDetected,
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

    const normalizedStatus =
      job.status === NotionDeliveryJobStatus.COMPLETED_WITH_ERRORS
        ? "failed"
        : job.status.toLowerCase();
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
          id: job.id,
          totalQuestions: job.totalQuestions,
          processedQuestions: job.processedQuestions,
          successQuestions: job.successQuestions,
          failedQuestions: job.failedQuestions,
          duplicateDetected: job.duplicateDetected,
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
