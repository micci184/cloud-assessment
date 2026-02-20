import { NextResponse } from "next/server";

export const messageResponse = (
  message: string,
  status: number,
): NextResponse => {
  return NextResponse.json({ message }, { status });
};

export const internalServerErrorResponse = (error: unknown): NextResponse => {
  console.error(error);
  return messageResponse("internal server error", 500);
};
