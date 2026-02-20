import { NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/auth/guards";
import { internalServerErrorResponse, messageResponse } from "@/lib/auth/http";
import { createAttemptExportCsv, createAttemptExportPayload } from "@/lib/attempt/export";
import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{ attemptId: string }>;
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

    const { attemptId } = await context.params;
    const url = new URL(request.url);
    const format = url.searchParams.get("format");

    if (format !== "json" && format !== "csv") {
      return messageResponse("format must be csv or json", 400);
    }

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

    const payload = createAttemptExportPayload(attempt);

    if (format === "json") {
      return NextResponse.json(payload, { status: 200 });
    }

    const csv = createAttemptExportCsv(payload);
    const filename = `attempt-${attempt.id}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${filename}\"`,
      },
    });
  } catch (error: unknown) {
    return internalServerErrorResponse(error);
  }
};

export { GET };
