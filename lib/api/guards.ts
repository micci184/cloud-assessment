import { type NextResponse } from "next/server";

import { getUserFromRequest, type AuthUser } from "@/lib/auth/guards";
import { messageResponse } from "@/lib/auth/http";
import { isJsonContentType, isValidOrigin } from "@/lib/auth/origin";

export const requireValidOrigin = (
  request: Request,
  message = "invalid origin",
): NextResponse | null => {
  if (!isValidOrigin(request)) {
    return messageResponse(message, 403);
  }

  return null;
};

export const requireJsonContentType = (
  request: Request,
): NextResponse | null => {
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
