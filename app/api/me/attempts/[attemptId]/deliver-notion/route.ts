import { NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/auth/guards";
import { internalServerErrorResponse, messageResponse } from "@/lib/auth/http";
import { isValidOrigin } from "@/lib/auth/origin";
import { deliverAttemptResultToNotion } from "@/lib/notion/delivery";
import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{ attemptId: string }>;
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

    const { attemptId } = await context.params;

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        result: {
          select: {
            overallPercent: true,
            categoryBreakdown: true,
          },
        },
      },
    });

    if (!attempt) {
      return messageResponse("attempt not found", 404);
    }

    if (attempt.userId !== user.id) {
      return messageResponse("forbidden", 403);
    }

    if (attempt.status !== "COMPLETED" || !attempt.result) {
      return messageResponse("attempt must be completed before delivery", 400);
    }

    const deliveryResult = await deliverAttemptResultToNotion({
      attemptId: attempt.id,
      userId: attempt.userId,
      status: attempt.status,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      overallPercent: attempt.result.overallPercent,
      categoryBreakdown: attempt.result.categoryBreakdown as Array<{
        category: string;
        total: number;
        correct: number;
        percent: number;
      }>,
    });

    if (deliveryResult.status === "failed") {
      return NextResponse.json(deliveryResult, { status: 502 });
    }

    return NextResponse.json(deliveryResult, { status: 200 });
  } catch (error: unknown) {
    return internalServerErrorResponse(error);
  }
};

export { POST };
