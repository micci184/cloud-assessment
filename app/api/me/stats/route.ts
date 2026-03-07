import { NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/auth/guards";
import { internalServerErrorResponse, messageResponse } from "@/lib/auth/http";
import { prisma } from "@/lib/db/prisma";

type CategoryAggregate = {
  total: number;
  correct: number;
};

type CategoryQuestion = {
  isCorrect: boolean | null;
  question: {
    category: string;
  };
};

const RECENT_CATEGORY_QUESTION_LIMIT = 30;

const toDateKey = (date: Date): string => {
  return date.toISOString().slice(0, 10);
};

const roundToOneDecimal = (value: number): number => {
  return Math.round(value * 10) / 10;
};

const calculateStreakDays = (activityDates: Date[]): number => {
  if (activityDates.length === 0) {
    return 0;
  }

  const activeDays = new Set(activityDates.map((date) => toDateKey(date)));
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);

  let streakDays = 0;
  while (activeDays.has(toDateKey(cursor))) {
    streakDays += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streakDays;
};

const createActivityBuckets = (
  days: number,
): Array<{ date: string; count: number }> => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: days }).map((_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (days - 1 - index));
    return {
      date: toDateKey(date),
      count: 0,
    };
  });
};

const aggregateCategoryProgress = (
  questions: CategoryQuestion[],
): Array<{ category: string; total: number; correct: number; percent: number }> => {
  const categoryMap = questions.reduce<Record<string, CategoryAggregate>>(
    (acc, question) => {
      const category = question.question.category;
      const current = acc[category] ?? { total: 0, correct: 0 };
      current.total += 1;
      if (question.isCorrect === true) {
        current.correct += 1;
      }
      acc[category] = current;
      return acc;
    },
    {},
  );

  return Object.entries(categoryMap).map(([category, aggregate]) => ({
    category,
    total: aggregate.total,
    correct: aggregate.correct,
    percent:
      aggregate.total === 0
        ? 0
        : roundToOneDecimal((aggregate.correct / aggregate.total) * 100),
  }));
};

const calculateWeaknessScore = (correct: number, total: number): number => {
  if (total <= 0) {
    return 0;
  }

  const correctRate = correct / total;
  const score = (1 - correctRate) * Math.log2(total + 1);
  return Math.round(score * 1000) / 1000;
};

export const GET = async (request: Request): Promise<NextResponse> => {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return messageResponse("unauthorized", 401);
    }

    const [
      allResults,
      recentResults,
      totalAnswered,
      completedQuestions,
      recentCategoryQuestions,
      answeredQuestions,
    ] =
      await Promise.all([
        prisma.result.findMany({
          where: {
            attempt: {
              userId: user.id,
            },
          },
          select: {
            overallPercent: true,
          },
        }),
        prisma.result.findMany({
          where: {
            attempt: {
              userId: user.id,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
          select: {
            overallPercent: true,
          },
        }),
        prisma.attemptQuestion.count({
          where: {
            attempt: {
              userId: user.id,
            },
            answeredAt: {
              not: null,
            },
          },
        }),
        prisma.attemptQuestion.findMany({
          where: {
            attempt: {
              userId: user.id,
              status: "COMPLETED",
            },
            isCorrect: {
              not: null,
            },
          },
          select: {
            isCorrect: true,
            question: {
              select: {
                category: true,
              },
            },
          },
        }),
        prisma.attemptQuestion.findMany({
          where: {
            attempt: {
              userId: user.id,
              status: "COMPLETED",
            },
            isCorrect: {
              not: null,
            },
            answeredAt: {
              not: null,
            },
          },
          orderBy: {
            answeredAt: "desc",
          },
          take: RECENT_CATEGORY_QUESTION_LIMIT,
          select: {
            isCorrect: true,
            question: {
              select: {
                category: true,
              },
            },
          },
        }),
        prisma.attemptQuestion.findMany({
          where: {
            attempt: {
              userId: user.id,
            },
            answeredAt: {
              not: null,
            },
          },
          select: {
            answeredAt: true,
          },
        }),
      ]);

    const totalAttempts = allResults.length;
    const averagePercent =
      totalAttempts === 0
        ? 0
        : roundToOneDecimal(
            allResults.reduce((sum, result) => sum + result.overallPercent, 0) /
              totalAttempts,
          );
    const bestPercent =
      totalAttempts === 0
        ? 0
        : roundToOneDecimal(
            allResults.reduce((max, result) =>
              Math.max(max, result.overallPercent),
            0),
          );

    const recentAveragePercent =
      recentResults.length === 0
        ? 0
        : roundToOneDecimal(
            recentResults.reduce((sum, result) => sum + result.overallPercent, 0) /
              recentResults.length,
          );

    const allAnsweredAt = answeredQuestions
      .map((question) => question.answeredAt)
      .filter((answeredAt): answeredAt is Date => answeredAt instanceof Date);
    const streakDays = calculateStreakDays(allAnsweredAt);

    const weeklyActivity = createActivityBuckets(7);
    const weeklyActivityMap = new Map(
      weeklyActivity.map((item) => [item.date, item]),
    );

    const activityHeatmap = createActivityBuckets(365);
    const activityHeatmapMap = new Map(
      activityHeatmap.map((item) => [item.date, item]),
    );

    for (const answeredAt of allAnsweredAt) {
      const key = toDateKey(answeredAt);
      const weeklyBucket = weeklyActivityMap.get(key);
      if (weeklyBucket) {
        weeklyBucket.count += 1;
      }
      const heatmapBucket = activityHeatmapMap.get(key);
      if (heatmapBucket) {
        heatmapBucket.count += 1;
      }
    }
    const recent7DaysAnswered = weeklyActivity.reduce(
      (sum, item) => sum + item.count,
      0,
    );

    const categoryProgress = aggregateCategoryProgress(completedQuestions).sort(
      (a, b) => a.category.localeCompare(b.category),
    );
    const recentCategoryProgress = aggregateCategoryProgress(recentCategoryQuestions).sort(
      (a, b) => a.category.localeCompare(b.category),
    );

    const weaknessRanking = categoryProgress
      .map((item) => ({
        ...item,
        weaknessScore: calculateWeaknessScore(item.correct, item.total),
      }))
      .filter((item) => item.total > 0)
      .sort((a, b) => {
        if (b.weaknessScore !== a.weaknessScore) {
          return b.weaknessScore - a.weaknessScore;
        }
        if (a.percent !== b.percent) {
          return a.percent - b.percent;
        }
        return b.total - a.total;
      })
      .slice(0, 3);

    return NextResponse.json({
      totalAttempts,
      averagePercent,
      recentAveragePercent,
      bestPercent,
      streakDays,
      totalAnswered,
      recent7DaysAnswered,
      weeklyActivity,
      activityHeatmap,
      categoryProgress,
      recentCategoryProgress,
      weaknessRanking,
    });
  } catch (error: unknown) {
    return internalServerErrorResponse(error);
  }
};
