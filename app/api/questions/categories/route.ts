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

    const url = new URL(request.url);
    const platform = url.searchParams.get("platform")?.trim() || undefined;
    const exam = url.searchParams.get("exam")?.trim() || undefined;

    const rows = await prisma.question.groupBy({
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
        existing.count += row._count.id;
      } else {
        categoryMap.set(key, {
          platform: row.platform,
          exam: row.exam,
          category: row.category,
          levels: [row.level],
          count: row._count.id,
        });
      }
    }

    const categories = Array.from(categoryMap.values());

    return NextResponse.json({ categories });
  } catch (error) {
    return internalServerErrorResponse(error);
  }
};
