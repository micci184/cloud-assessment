import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/auth/cookie";
import { getUserFromRequest } from "@/lib/auth/guards";
import { messageResponse } from "@/lib/auth/http";
import { isValidOrigin } from "@/lib/auth/origin";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isValidOrigin(request)) {
    return messageResponse("forbidden origin", 403);
  }

  const user = await getUserFromRequest(request);

  if (!user) {
    return messageResponse("unauthorized", 401);
  }

  const response = NextResponse.json({ message: "ok" }, { status: 200 });
  clearSessionCookie(response);

  return response;
}
