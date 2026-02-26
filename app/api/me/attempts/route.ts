import { NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/auth/guards";
import { messageResponse, internalServerErrorResponse } from "@/lib/auth/http";
import { prisma } from "@/lib/db/prisma";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

const parsePositiveInt = (value: string | null): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
};

export const GET = async (request: Request): Promise<NextResponse> => {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return messageResponse("unauthorized", 401);
    }

    const url = new URL(request.url);
    const requestedPage = parsePositiveInt(url.searchParams.get("page")) ?? 1;
    const requestedPageSize =
      parsePositiveInt(url.searchParams.get("pageSize")) ?? DEFAULT_PAGE_SIZE;
    const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);

    const totalCount = await prisma.attempt.count({
      where: { userId: user.id },
    });
    const totalPages = Math.ceil(totalCount / pageSize);
    const currentPage =
      totalPages === 0 ? 1 : Math.min(requestedPage, totalPages);
    const skip = (currentPage - 1) * pageSize;

    const attempts = await prisma.attempt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
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

    return NextResponse.json({
      attempts: data,
      pagination: {
        totalCount,
        totalPages,
        currentPage,
        pageSize,
      },
    });
  } catch (error) {
    return internalServerErrorResponse(error);
  }
};
