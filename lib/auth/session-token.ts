import { SESSION_MAX_AGE_SECONDS } from "@/lib/auth/constants";
import { signSession } from "@/lib/auth/session";

export function createSessionToken(input: {
  userId: string;
  tokenVersion: number;
  authSecret: string;
}): string {
  return signSession(
    {
      userId: input.userId,
      tokenVersion: input.tokenVersion,
      exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    },
    input.authSecret,
  );
}
