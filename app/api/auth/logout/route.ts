import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/auth/cookie";
import { getUserFromRequest } from "@/lib/auth/guards";
import { internalServerErrorResponse, messageResponse } from "@/lib/auth/http";
import { isValidOrigin } from "@/lib/auth/origin";
import { prisma } from "@/lib/db/prisma";

export const POST = async (request: Request): Promise<NextResponse> => {
  try {
    if (!isValidOrigin(request)) {
      return messageResponse("forbidden origin", 403);
    }

    const user = await getUserFromRequest(request);

    if (!user) {
      return messageResponse("unauthorized", 401);
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
