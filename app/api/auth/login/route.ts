import { NextResponse } from "next/server";

import { setSessionCookie } from "@/lib/auth/cookie";
import { getAuthSecret } from "@/lib/auth/config";
import { internalServerErrorResponse, messageResponse } from "@/lib/auth/http";
import { isValidOrigin, isJsonContentType } from "@/lib/auth/origin";
import { verifyPassword } from "@/lib/auth/password";
import { authInputSchema } from "@/lib/auth/schemas";
import { createSessionToken } from "@/lib/auth/session-token";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isValidOrigin(request)) {
    return messageResponse("forbidden origin", 403);
  }

  if (!isJsonContentType(request)) {
    return messageResponse("content-type must be application/json", 415);
  }

  try {
    const body = await request.json();
    const parsed = authInputSchema.safeParse(body);

    if (!parsed.success) {
      return messageResponse(
        parsed.error.issues[0]?.message ?? "invalid request",
        400,
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: parsed.data.email,
      },
      select: {
        id: true,
        passwordHash: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      return messageResponse("invalid credentials", 401);
    }

    const passwordMatched = await verifyPassword(
      parsed.data.password,
      user.passwordHash,
    );

    if (!passwordMatched) {
      return messageResponse("invalid credentials", 401);
    }

    const token = createSessionToken({
      userId: user.id,
      tokenVersion: user.tokenVersion,
      authSecret: getAuthSecret(),
    });

    const response = NextResponse.json({ message: "ok" }, { status: 200 });
    setSessionCookie(response, token);

    return response;
  } catch (error: unknown) {
    return internalServerErrorResponse(error);
  }
}
