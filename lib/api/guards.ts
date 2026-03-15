import { NextResponse, type NextResponse as NextResponseType } from "next/server";

import {
  checkAuthenticatedWriteRateLimit,
  getAuthenticatedWriteRateLimitKey,
  registerAuthenticatedWriteAttempt,
} from "@/lib/auth/authenticated-write-rate-limit";
import { getUserFromRequest, type AuthUser } from "@/lib/auth/guards";
import { messageResponse } from "@/lib/auth/http";
import { isJsonContentType, isValidOrigin } from "@/lib/auth/origin";

export const requireValidOrigin = (
  request: Request,
  message = "invalid origin",
): NextResponseType | null => {
  if (!isValidOrigin(request)) {
    return messageResponse(message, 403);
  }

  return null;
};

export const requireJsonContentType = (
  request: Request,
): NextResponseType | null => {
  if (!isJsonContentType(request)) {
    return messageResponse("content-type must be application/json", 415);
  }

  return null;
};

export const requireAuthenticatedUser = async (
  request: Request,
): Promise<{ user: AuthUser | null; response: NextResponse | null }> => {
  const user = await getUserFromRequest(request);

  if (!user) {
    return { user: null, response: messageResponse("unauthorized", 401) };
  }

  return { user, response: null };
};

export const requireAuthenticatedWriteRateLimit = (
  request: Request,
  userId: string,
): NextResponse | null => {
  const key = getAuthenticatedWriteRateLimitKey(request, userId);
  const checkResult = checkAuthenticatedWriteRateLimit(key);
  if (!checkResult.allowed) {
    return NextResponse.json(
      { message: "操作回数が上限に達しました。時間をおいて再試行してください" },
      {
        status: 429,
        headers: { "Retry-After": String(checkResult.retryAfterSeconds) },
      },
    );
  }

  const registerResult = registerAuthenticatedWriteAttempt(key);
  if (!registerResult.allowed) {
    return NextResponse.json(
      { message: "操作回数が上限に達しました。時間をおいて再試行してください" },
      {
        status: 429,
        headers: { "Retry-After": String(registerResult.retryAfterSeconds) },
      },
    );
  }

  return null;
};
