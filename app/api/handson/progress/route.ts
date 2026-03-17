import { NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/api/guards";
import { internalServerErrorResponse, messageResponse } from "@/lib/auth/http";
import { prisma } from "@/lib/db/prisma";

export const GET = async (request: Request): Promise<NextResponse> => {
  try {
    const { user, response: unauthorizedResponse } =
      await requireAuthenticatedUser(request);
    if (unauthorizedResponse || !user) {
      return unauthorizedResponse ?? messageResponse("unauthorized", 401);
    }

    const progresses = await prisma.handsOnProgress.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        stepProgresses: {
          where: { isCompleted: true },
          select: { stepIndex: true },
          orderBy: { stepIndex: "asc" },
        },
      },
    });

    return NextResponse.json(
      {
        progresses: progresses.map((progress) => {
          const completedSteps = progress.stepProgresses.map(
            (step) => step.stepIndex,
          );
          return {
            courseSlug: progress.courseSlug,
            status: progress.status,
            currentStep: progress.currentStep,
            completedSteps,
            totalCompletedSteps: completedSteps.length,
            startedAt: progress.startedAt,
            completedAt: progress.completedAt,
          };
        }),
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return internalServerErrorResponse(error);
  }
};
