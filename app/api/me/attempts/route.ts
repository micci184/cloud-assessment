import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/auth/guards";
import { messageResponse, internalServerErrorResponse } from "@/lib/auth/http";
import { prisma } from "@/lib/db/prisma";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

const attemptsQuerySchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((value) => value >= 1)
    .optional(),
  pageSize: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((value) => value >= 1 && value <= MAX_PAGE_SIZE)
    .optional(),
});

type AttemptWithResult = {
  id: string;
  status: "IN_PROGRESS" | "COMPLETED";
  filters: unknown;
  startedAt: Date;
  completedAt: Date | null;
  result: {
    overallPercent: number;
    categoryBreakdown: unknown;
  } | null;
};

const toAttemptSummary = (attempt: AttemptWithResult) => ({
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
});

export const GET = async (request: Request): Promise<NextResponse> => {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return messageResponse("unauthorized", 401);
    }

    const url = new URL(request.url);
    const queryResult = attemptsQuerySchema.safeParse({
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });
    if (!queryResult.success) {
      return messageResponse("invalid query parameters", 400);
    }
    const requestedPage = queryResult.data.page ?? 1;
    const pageSize = queryResult.data.pageSize ?? DEFAULT_PAGE_SIZE;

    const [totalCount, latestCompleted, latestInProgress] = await Promise.all([
      prisma.attempt.count({
        where: { userId: user.id },
      }),
      prisma.attempt.findFirst({
        where: { userId: user.id, status: "COMPLETED" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          result: {
            select: {
              overallPercent: true,
              categoryBreakdown: true,
            },
          },
        },
      }),
      prisma.attempt.findFirst({
        where: { userId: user.id, status: "IN_PROGRESS" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          result: {
            select: {
              overallPercent: true,
              categoryBreakdown: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);
    const currentPage =
      totalPages === 0 ? 1 : Math.min(requestedPage, totalPages);
    const skip = (currentPage - 1) * pageSize;

    const pagedAttempts = await prisma.attempt.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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

    const data = pagedAttempts.map((attempt) =>
      toAttemptSummary(attempt as AttemptWithResult),
    );

    return NextResponse.json({
      attempts: data,
      pagination: {
        totalCount,
        totalPages,
        currentPage,
        pageSize,
      },
      summary: {
        latestCompleted: latestCompleted
          ? toAttemptSummary(latestCompleted as AttemptWithResult)
          : null,
        latestInProgress: latestInProgress
          ? toAttemptSummary(latestInProgress as AttemptWithResult)
          : null,
      },
    });
  } catch (error) {
    return internalServerErrorResponse(error);
  }
};
