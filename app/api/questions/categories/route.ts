import { NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/auth/guards";
import { messageResponse, internalServerErrorResponse } from "@/lib/auth/http";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return messageResponse("unauthorized", 401);
    }

    const rows = await prisma.question.groupBy({
      by: ["category", "level"],
      _count: { id: true },
      orderBy: [{ category: "asc" }, { level: "asc" }],
    });

    const categoryMap = new Map<
      string,
      { category: string; levels: number[]; count: number }
    >();

    for (const row of rows) {
      const existing = categoryMap.get(row.category);

      if (existing) {
        if (!existing.levels.includes(row.level)) {
          existing.levels.push(row.level);
        }
        existing.count += row._count.id;
      } else {
        categoryMap.set(row.category, {
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
}
