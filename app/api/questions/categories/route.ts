import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { getUserFromRequest } from "@/lib/auth/guards";
import { messageResponse, internalServerErrorResponse } from "@/lib/auth/http";
import { prisma } from "@/lib/db/prisma";

export const GET = async (request: Request): Promise<NextResponse> => {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return messageResponse("unauthorized", 401);
    }

    const url = new URL(request.url);
    const platform = url.searchParams.get("platform")?.trim() || undefined;
    const exam = url.searchParams.get("exam")?.trim() || undefined;

    let rows: Array<{
      platform: string;
      exam: string;
      category: string;
      level: number;
      count: number;
    }>;
    try {
      const latestRows = await prisma.question.groupBy({
        by: ["platform", "exam", "category", "level"],
        where: {
          ...(platform ? { platform } : {}),
          ...(exam ? { exam } : {}),
        },
        _count: { id: true },
        orderBy: [
          { platform: "asc" },
          { exam: "asc" },
          { category: "asc" },
          { level: "asc" },
        ],
      });
      rows = latestRows.map((row) => ({
        platform: row.platform,
        exam: row.exam,
        category: row.category,
        level: row.level,
        count: row._count.id,
      }));
    } catch (error) {
      // Backward-compatible fallback for local DBs that have not applied Issue #152 migration yet.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2022"
      ) {
        if (
          (platform !== undefined && platform !== "AWS") ||
          (exam !== undefined && exam !== "CP")
        ) {
          return NextResponse.json({ categories: [] });
        }

        const legacyRows = await prisma.question.groupBy({
          by: ["category", "level"],
          _count: { id: true },
          orderBy: [{ category: "asc" }, { level: "asc" }],
        });
        rows = legacyRows.map((row) => ({
          platform: "AWS",
          exam: "CP",
          category: row.category,
          level: row.level,
          count: row._count.id,
        }));
      } else {
        throw error;
      }
    }

    const categoryMap = new Map<
      string,
      {
        platform: string;
        exam: string;
        category: string;
        levels: number[];
        count: number;
      }
    >();

    for (const row of rows) {
      const key = `${row.platform}::${row.exam}::${row.category}`;
      const existing = categoryMap.get(key);

      if (existing) {
        if (!existing.levels.includes(row.level)) {
          existing.levels.push(row.level);
        }
        existing.count += row.count;
      } else {
        categoryMap.set(key, {
          platform: row.platform,
          exam: row.exam,
          category: row.category,
          levels: [row.level],
          count: row.count,
        });
      }
    }

    const categories = Array.from(categoryMap.values());

    return NextResponse.json({ categories });
  } catch (error) {
    return internalServerErrorResponse(error);
  }
};
