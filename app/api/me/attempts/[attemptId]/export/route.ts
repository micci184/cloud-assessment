import { NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/auth/guards";
import { internalServerErrorResponse, messageResponse } from "@/lib/auth/http";
import {
  createAttemptExportCsv,
  createAttemptExportPayload,
} from "@/lib/attempt/export";
import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{ attemptId: string }>;
};

type Format = "csv" | "json";

const isFormat = (value: string): value is Format => {
  return value === "csv" || value === "json";
};

export const GET = async (
  request: Request,
  context: RouteContext,
): Promise<NextResponse> => {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return messageResponse("unauthorized", 401);
    }

    const { attemptId } = await context.params;
    const { searchParams } = new URL(request.url);
    const formatParam = searchParams.get("format");

    if (!formatParam || !isFormat(formatParam)) {
      return messageResponse("format must be csv or json", 400);
    }

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        result: true,
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
      },
    });

    if (!attempt) {
      return messageResponse("attempt not found", 404);
    }

    if (attempt.userId !== user.id) {
      return messageResponse("forbidden", 403);
    }

    if (attempt.status !== "COMPLETED" || !attempt.result) {
      return messageResponse("attempt must be completed before export", 400);
    }

    const payload = createAttemptExportPayload({
      attemptId: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      filters: (attempt.filters ?? {}) as {
        categories?: string[];
        level?: number;
        count?: number;
      },
      result: {
        overallPercent: attempt.result.overallPercent,
        categoryBreakdown: attempt.result.categoryBreakdown as {
          category: string;
          total: number;
          correct: number;
          percent: number;
        }[],
      },
      questions: attempt.questions.map((question) => ({
        order: question.order,
        category: question.question.category,
        level: question.question.level,
        questionText: question.question.questionText,
        choices: question.question.choices as string[],
        answerIndex: question.question.answerIndex,
        selectedIndex: question.selectedIndex,
        isCorrect: question.isCorrect,
        explanation: question.question.explanation,
      })),
    });

    if (formatParam === "json") {
      return NextResponse.json(payload);
    }

    const csv = createAttemptExportCsv(payload);
    const filename = `attempt-${attempt.id}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return internalServerErrorResponse(error);
  }
};
