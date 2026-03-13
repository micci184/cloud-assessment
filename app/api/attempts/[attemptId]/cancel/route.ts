import { NextResponse } from "next/server";

import { attemptParamsSchema } from "@/lib/attempt/schemas";
import { requireAuthenticatedUser, requireValidOrigin } from "@/lib/api/guards";
import { internalServerErrorResponse, messageResponse } from "@/lib/auth/http";
import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{ attemptId: string }>;
};

type AttemptSnapshot = {
  id: string;
  userId: string;
  status: string;
};

const findAttemptSnapshot = async (
  attemptId: string,
): Promise<AttemptSnapshot | null> => {
  const rows = await prisma.$queryRaw<AttemptSnapshot[]>`
    SELECT "id", "userId", "status"::text AS "status"
    FROM "Attempt"
    WHERE "id" = ${attemptId}
    LIMIT 1
  `;

  return rows[0] ?? null;
};

export const POST = async (
  request: Request,
  context: RouteContext,
): Promise<NextResponse> => {
  try {
    const invalidOriginResponse = requireValidOrigin(request);
    if (invalidOriginResponse) {
      return invalidOriginResponse;
    }

    const { user, response: unauthorizedResponse } =
      await requireAuthenticatedUser(request);
    if (unauthorizedResponse || !user) {
      return unauthorizedResponse ?? messageResponse("unauthorized", 401);
    }

    const rawParams = await context.params;
    const parsedParams = attemptParamsSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return messageResponse(
        parsedParams.error.issues[0]?.message ?? "invalid attemptId",
        400,
      );
    }

    const { attemptId } = parsedParams.data;

    const attempt = await findAttemptSnapshot(attemptId);
    if (!attempt) {
      return messageResponse("attempt not found", 404);
    }
    if (attempt.userId !== user.id) {
      return messageResponse("forbidden", 403);
    }

    if (attempt.status === "COMPLETED") {
      return messageResponse("完了済みの試験は中止できません", 409);
    }
    if (attempt.status === "CANCELLED") {
      return messageResponse("この試験は既に中止済みです", 400);
    }

    const updatedCount = await prisma.$executeRaw`
      UPDATE "Attempt"
      SET
        "status" = 'CANCELLED'::"AttemptStatus",
        "completedAt" = NOW(),
        "updatedAt" = NOW()
      WHERE
        "id" = ${attempt.id}
        AND "userId" = ${user.id}
        AND "status" = 'IN_PROGRESS'::"AttemptStatus"
    `;

    if (updatedCount === 0) {
      const latestAttempt = await findAttemptSnapshot(attempt.id);
      if (!latestAttempt || latestAttempt.userId !== user.id) {
        return messageResponse("attempt not found", 404);
      }
      if (latestAttempt.status === "CANCELLED") {
        return messageResponse("この試験は既に中止済みです", 400);
      }
      if (latestAttempt.status === "COMPLETED") {
        return messageResponse("完了済みの試験は中止できません", 409);
      }

      return messageResponse("受験の中止に失敗しました", 409);
    }

    return NextResponse.json({ message: "ok" }, { status: 200 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("AttemptStatus") &&
      error.message.includes("CANCELLED")
    ) {
      return messageResponse(
        "中止機能の反映が未完了です。サーバー再起動後に再試行してください",
        409,
      );
    }
    return internalServerErrorResponse(error);
  }
};
