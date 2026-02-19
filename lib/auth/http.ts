import { NextResponse } from "next/server";

export function messageResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ message }, { status });
}

export function internalServerErrorResponse(error: unknown): NextResponse {
  console.error(error);
  return messageResponse("internal server error", 500);
}
