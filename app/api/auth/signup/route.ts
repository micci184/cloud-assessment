import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { setSessionCookie } from "@/lib/auth/cookie";
import { getAuthSecret } from "@/lib/auth/config";
import { internalServerErrorResponse, messageResponse } from "@/lib/auth/http";
import { isValidOrigin, isJsonContentType } from "@/lib/auth/origin";
import { hashPassword } from "@/lib/auth/password";
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
      return messageResponse("email already exists", 409);
    }

    return internalServerErrorResponse(error);
  }
}
