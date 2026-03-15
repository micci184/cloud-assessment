import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/auth/guards";
import { messageResponse, internalServerErrorResponse } from "@/lib/auth/http";
import { prisma } from "@/lib/db/prisma";

const categoriesQuerySchema = z.object({
  platform: z.string().trim().min(1).max(50).optional(),
  exam: z.string().trim().min(1).max(50).optional(),
});

export const GET = async (request: Request): Promise<NextResponse> => {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return messageResponse("unauthorized", 401);
    }

    const url = new URL(request.url);
    const rawPlatform = url.searchParams.get("platform") ?? undefined;
    const rawExam = url.searchParams.get("exam") ?? undefined;

    const parsed = categoriesQuerySchema.safeParse({
      platform: rawPlatform,
      exam: rawExam,
    });
    if (!parsed.success) {
      return messageResponse(
        parsed.error.issues[0]?.message ?? "invalid query parameters",
        400,
      );
    }
    const { platform, exam } = parsed.data;

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
    const rows = latestRows.map((row) => ({
      platform: row.platform,
      exam: row.exam,
      category: row.category,
      level: row.level,
      count: row._count.id,
    }));

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
