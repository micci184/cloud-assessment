import { NextResponse } from "next/server";

import { requireAuthenticatedUser, requireValidOrigin } from "@/lib/api/guards";
import { clearSessionCookie } from "@/lib/auth/cookie";
import { internalServerErrorResponse, messageResponse } from "@/lib/auth/http";
import { prisma } from "@/lib/db/prisma";

export const POST = async (request: Request): Promise<NextResponse> => {
  try {
    const invalidOriginResponse = requireValidOrigin(request, "forbidden origin");
    if (invalidOriginResponse) {
      return invalidOriginResponse;
    }

    const { user, response: unauthorizedResponse } =
      await requireAuthenticatedUser(request);
    if (unauthorizedResponse || !user) {
      return unauthorizedResponse ?? messageResponse("unauthorized", 401);
    }

    // Invalidate all existing sessions by rotating tokenVersion.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        tokenVersion: {
          increment: 1,
        },
      },
    });

    const response = NextResponse.json({ message: "ok" }, { status: 200 });
    clearSessionCookie(response);

    return response;
  } catch (error: unknown) {
    return internalServerErrorResponse(error);
  }
};
