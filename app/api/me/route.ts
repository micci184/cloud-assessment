import { NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/auth/guards";
import { internalServerErrorResponse, messageResponse } from "@/lib/auth/http";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return messageResponse("unauthorized", 401);
    }

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return internalServerErrorResponse(error);
  }
}
