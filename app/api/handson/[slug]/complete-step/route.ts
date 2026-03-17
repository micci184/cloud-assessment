import { NextResponse } from "next/server";

import {
  requireAuthenticatedUser,
  requireJsonContentType,
  requireValidOrigin,
} from "@/lib/api/guards";
import { internalServerErrorResponse, messageResponse } from "@/lib/auth/http";
import { prisma } from "@/lib/db/prisma";
import {
  completeStepSchema,
  handsonSlugParamsSchema,
} from "@/lib/handson/schemas";

type RouteContext = {
  params: Promise<{ slug: string }>;
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
    const parsedParams = handsonSlugParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      return messageResponse(
        parsedParams.error.issues[0]?.message ?? "invalid slug",
        400,
      );
    }

    const body: unknown = await request.json();
    const parsedBody = completeStepSchema.safeParse(body);
    if (!parsedBody.success) {
      return messageResponse(
        parsedBody.error.issues[0]?.message ?? "invalid input",
        400,
      );
    }

    const { slug } = parsedParams.data;
    const { stepIndex, totalSteps } = parsedBody.data;
    if (stepIndex >= totalSteps) {
      return messageResponse("stepIndex is out of range", 400);
    }

    const result = await prisma.$transaction(async (transaction) => {
      const uniqueWhere = {
        userId_courseSlug: {
          userId: user.id,
          courseSlug: slug,
        },
      };

      const current = await transaction.handsOnProgress.findUnique({
        where: uniqueWhere,
        select: {
          id: true,
          currentStep: true,
        },
      });

      const now = new Date();
      let progressId = current?.id;

      if (!progressId) {
        const created = await transaction.handsOnProgress.create({
          data: {
            userId: user.id,
            courseSlug: slug,
            status: "IN_PROGRESS",
            currentStep: Math.min(stepIndex + 1, totalSteps - 1),
            startedAt: now,
          },
          select: { id: true },
        });
        progressId = created.id;
      }

      await transaction.handsOnStepProgress.upsert({
        where: {
          progressId_stepIndex: {
            progressId,
            stepIndex,
          },
        },
        create: {
          progressId,
          stepIndex,
          isCompleted: true,
          completedAt: now,
        },
        update: {
          isCompleted: true,
          completedAt: now,
        },
      });

      const totalCompletedSteps = await transaction.handsOnStepProgress.count({
        where: {
          progressId,
          isCompleted: true,
        },
      });

      const isCourseCompleted = totalCompletedSteps >= totalSteps;
      const nextCurrentStep = Math.min(stepIndex + 1, totalSteps - 1);
      const currentStep = Math.max(current?.currentStep ?? 0, nextCurrentStep);

      const updated = await transaction.handsOnProgress.update({
        where: { id: progressId },
        data: isCourseCompleted
          ? {
              status: "COMPLETED",
              currentStep: totalSteps - 1,
              completedAt: now,
            }
          : {
              status: "IN_PROGRESS",
              currentStep,
            },
        select: {
          status: true,
        },
      });

      return {
        courseStatus: updated.status,
        totalCompletedSteps,
      };
    });

    return NextResponse.json(
      {
        stepIndex,
        isCompleted: true,
        courseStatus: result.courseStatus,
        totalCompletedSteps: result.totalCompletedSteps,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return internalServerErrorResponse(error);
  }
};
