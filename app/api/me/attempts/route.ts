import { NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/auth/guards";
import { messageResponse, internalServerErrorResponse } from "@/lib/auth/http";
import { prisma } from "@/lib/db/prisma";

export const GET = async (request: Request): Promise<NextResponse> => {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return messageResponse("unauthorized", 401);
    }

    const attempts = await prisma.attempt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        result: {
          select: {
            overallPercent: true,
            categoryBreakdown: true,
          },
        },
      },
    });

    const data = attempts.map((attempt) => ({
      id: attempt.id,
      status: attempt.status,
      filters: attempt.filters,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      result: attempt.result
        ? {
            overallPercent: attempt.result.overallPercent,
            categoryBreakdown: attempt.result.categoryBreakdown,
          }
        : null,
    }));

    return NextResponse.json({ attempts: data });
  } catch (error) {
    return internalServerErrorResponse(error);
  }
};
