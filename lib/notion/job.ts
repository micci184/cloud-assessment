import { NotionDeliveryJobStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  deliverAttemptResultToNotionDetailed,
  type NotionDeliveryFailureItem,
  type NotionDeliveryInput,
} from "@/lib/notion/delivery";

const toFailureJson = (
  failures: NotionDeliveryFailureItem[],
): Prisma.JsonArray => {
  return failures.map((failure) => ({
    category: failure.category,
    level: failure.level,
    questionText: failure.questionText,
    errorMessage: failure.errorMessage,
  })) as Prisma.JsonArray;
};

const updateJobProgress = async (
  jobId: string,
  progress: {
    processedQuestions: number;
    successQuestions: number;
    failedQuestions: number;
    lastError: string | null;
  },
): Promise<void> => {
  await prisma.notionDeliveryJob.update({
    where: { id: jobId },
    data: {
      processedQuestions: progress.processedQuestions,
      successQuestions: progress.successQuestions,
      failedQuestions: progress.failedQuestions,
      lastError: progress.lastError,
    },
  });
};

export const runNotionDeliveryJob = async (
  jobId: string,
  input: NotionDeliveryInput,
): Promise<void> => {
  console.info(
    JSON.stringify({
      event: "notion_delivery_job_started",
      jobId,
      attemptId: input.attemptId,
      totalQuestions: input.questions.length,
    }),
  );

  const startedAt = new Date();
  await prisma.notionDeliveryJob.update({
    where: { id: jobId },
    data: {
      status: NotionDeliveryJobStatus.IN_PROGRESS,
      startedAt,
    },
  });

  try {
    const result = await deliverAttemptResultToNotionDetailed(
      input,
      async (progress) => {
        await updateJobProgress(jobId, progress);
      },
    );

    const finishedAt = new Date();
    if (result.status === "completed") {
      await prisma.notionDeliveryJob.update({
        where: { id: jobId },
        data: {
          status: NotionDeliveryJobStatus.COMPLETED,
          processedQuestions: result.processedQuestions,
          successQuestions: result.successQuestions,
          failedQuestions: result.failedQuestions,
          failedItems: toFailureJson(result.failures),
          finishedAt,
        },
      });
      console.info(
        JSON.stringify({
          event: "notion_delivery_job_completed",
          jobId,
          attemptId: input.attemptId,
          successQuestions: result.successQuestions,
          failedQuestions: result.failedQuestions,
        }),
      );
      return;
    }

    if (result.status === "completed_with_errors") {
      await prisma.notionDeliveryJob.update({
        where: { id: jobId },
        data: {
          status: NotionDeliveryJobStatus.COMPLETED_WITH_ERRORS,
          processedQuestions: result.processedQuestions,
          successQuestions: result.successQuestions,
          failedQuestions: result.failedQuestions,
          lastError: result.failures[0]?.errorMessage ?? null,
          failedItems: toFailureJson(result.failures),
          finishedAt,
        },
      });
      console.warn(
        JSON.stringify({
          event: "notion_delivery_job_completed_with_errors",
          jobId,
          attemptId: input.attemptId,
          successQuestions: result.successQuestions,
          failedQuestions: result.failedQuestions,
          lastError: result.failures[0]?.errorMessage ?? null,
        }),
      );
      return;
    }

    if (result.status === "skipped") {
      await prisma.notionDeliveryJob.update({
        where: { id: jobId },
        data: {
          status: NotionDeliveryJobStatus.FAILED,
          lastError: "missing notion config",
          finishedAt,
        },
      });
      console.error(
        JSON.stringify({
          event: "notion_delivery_job_failed_missing_config",
          jobId,
          attemptId: input.attemptId,
        }),
      );
      return;
    }

    await prisma.notionDeliveryJob.update({
      where: { id: jobId },
      data: {
        status: NotionDeliveryJobStatus.FAILED,
        processedQuestions: result.processedQuestions,
        successQuestions: result.successQuestions,
        failedQuestions: result.failedQuestions,
        lastError: result.errorMessage,
        failedItems: toFailureJson(result.failures),
        finishedAt,
      },
    });
    console.error(
      JSON.stringify({
        event: "notion_delivery_job_failed",
        jobId,
        attemptId: input.attemptId,
        lastError: result.errorMessage,
      }),
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "notion delivery job failed";
    await prisma.notionDeliveryJob.update({
      where: { id: jobId },
      data: {
        status: NotionDeliveryJobStatus.FAILED,
        lastError: message,
        finishedAt: new Date(),
      },
    });
    console.error(
      JSON.stringify({
        event: "notion_delivery_job_exception",
        jobId,
        attemptId: input.attemptId,
        error: message,
      }),
    );
  }
};
