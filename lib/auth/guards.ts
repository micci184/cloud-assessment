import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAuthSecret } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySession } from "@/lib/auth/session";

export type AuthUser = {
  id: string;
  email: string;
  tokenVersion: number;
};

const findSessionUser = async (
  token: string | undefined,
): Promise<AuthUser | null> => {
  if (!token) {
    return null;
  }

  const payload = verifySession(token, getAuthSecret());

  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      tokenVersion: true,
    },
  });

  if (!user) {
    return null;
  }

  if (user.tokenVersion !== payload.tokenVersion) {
    return null;
  }

  return user;
};

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  return findSessionUser(sessionCookie);
};

export const getUserFromRequest = async (
  request: Request,
): Promise<AuthUser | null> => {
  const sessionCookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(`${SESSION_COOKIE_NAME}=`.length);

  return findSessionUser(sessionCookie);
};

export const requireUser = async (): Promise<AuthUser> => {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
};
