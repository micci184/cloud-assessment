import { NextResponse } from "next/server";

import { setSessionCookie } from "@/lib/auth/cookie";
import { getAuthSecret } from "@/lib/auth/config";
import { internalServerErrorResponse, messageResponse } from "@/lib/auth/http";
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  getLoginRateLimitKey,
  registerFailedLoginAttempt,
} from "@/lib/auth/login-rate-limit";
import { isValidOrigin, isJsonContentType } from "@/lib/auth/origin";
import { verifyPassword } from "@/lib/auth/password";
import { loginInputSchema } from "@/lib/auth/schemas";
import { createSessionToken } from "@/lib/auth/session-token";
import { prisma } from "@/lib/db/prisma";

export const POST = async (request: Request): Promise<NextResponse> => {
  if (!isValidOrigin(request)) {
    return messageResponse("forbidden origin", 403);
  }

  if (!isJsonContentType(request)) {
    return messageResponse("content-type must be application/json", 415);
  }

  try {
    const body = await request.json();
    const parsed = loginInputSchema.safeParse(body);

    if (!parsed.success) {
      return messageResponse(
        parsed.error.issues[0]?.message ?? "invalid request",
        400,
      );
    }

    const rateLimitKey = getLoginRateLimitKey(request, parsed.data.email);
    const rateLimitCheck = checkLoginRateLimit(rateLimitKey);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { message: "too many login attempts. please try again later" },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitCheck.retryAfterSeconds),
          },
        },
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
      registerFailedLoginAttempt(rateLimitKey);
      return messageResponse("invalid credentials", 401);
    }

    const passwordMatched = await verifyPassword(
      parsed.data.password,
      user.passwordHash,
    );

    if (!passwordMatched) {
      registerFailedLoginAttempt(rateLimitKey);
      return messageResponse("invalid credentials", 401);
    }

    const token = createSessionToken({
      userId: user.id,
      tokenVersion: user.tokenVersion,
      authSecret: getAuthSecret(),
    });

    const response = NextResponse.json({ message: "ok" }, { status: 200 });
    setSessionCookie(response, token);
    clearLoginRateLimit(rateLimitKey);

    return response;
  } catch (error: unknown) {
    return internalServerErrorResponse(error);
  }
};
