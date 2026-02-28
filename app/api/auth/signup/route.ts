import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { requireJsonContentType, requireValidOrigin } from "@/lib/api/guards";
import { setSessionCookie } from "@/lib/auth/cookie";
import { getAuthSecret } from "@/lib/auth/config";
import { internalServerErrorResponse, messageResponse } from "@/lib/auth/http";
import { hashPassword } from "@/lib/auth/password";
import {
  checkSignupRateLimit,
  getSignupRateLimitKey,
  registerSignupAttempt,
} from "@/lib/auth/signup-rate-limit";
import { signupInputSchema } from "@/lib/auth/schemas";
import { createSessionToken } from "@/lib/auth/session-token";
import { prisma } from "@/lib/db/prisma";

export const POST = async (request: Request): Promise<NextResponse> => {
  const invalidOriginResponse = requireValidOrigin(request, "forbidden origin");
  if (invalidOriginResponse) {
    return invalidOriginResponse;
  }

  const invalidContentTypeResponse = requireJsonContentType(request);
  if (invalidContentTypeResponse) {
    return invalidContentTypeResponse;
  }

  try {
    const body = await request.json();
    const parsed = signupInputSchema.safeParse(body);

    if (!parsed.success) {
      return messageResponse(
        parsed.error.issues[0]?.message ?? "invalid request",
        400,
      );
    }

    const rateLimitKey = getSignupRateLimitKey(request);
    const rateLimitCheck = checkSignupRateLimit(rateLimitKey);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { message: "too many signup attempts. please try again later" },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitCheck.retryAfterSeconds),
          },
        },
      );
    }

    const attemptResult = registerSignupAttempt(rateLimitKey);
    if (!attemptResult.allowed) {
      return NextResponse.json(
        { message: "too many signup attempts. please try again later" },
        {
          status: 429,
          headers: {
            "Retry-After": String(attemptResult.retryAfterSeconds),
          },
        },
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);

    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash,
      },
      select: {
        id: true,
        tokenVersion: true,
      },
    });

    const token = createSessionToken({
      userId: user.id,
      tokenVersion: user.tokenVersion,
      authSecret: getAuthSecret(),
    });

    const response = NextResponse.json({ message: "ok" }, { status: 201 });
    setSessionCookie(response, token);

    return response;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return messageResponse("signup failed", 400);
    }

    return internalServerErrorResponse(error);
  }
};
