"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export const HeaderNav = (): React.ReactElement => {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isSelectPage = pathname === "/select" || pathname.startsWith("/quiz/");
  const isMyPage = pathname === "/me";

  const getNavLinkClassName = (isActive: boolean): string => {
    return `rounded-full px-3 py-1.5 transition ${
      isActive
        ? "bg-brand-300 text-neutral-900 dark:bg-brand-400 dark:text-white"
        : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
    }`;
  };

  useEffect(() => {
    if (isLoginPage) {
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      return;
    }

    setIsLoadingAuth(true);
    const fetchMe = async (): Promise<void> => {
      try {
        const response = await fetch("/api/me");
        setIsAuthenticated(response.ok);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    void fetchMe();
  }, [pathname, isLoginPage]);

  const handleLogout = async (): Promise<void> => {
    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (response.ok) {
        setIsAuthenticated(false);
        router.push("/login");
        router.refresh();
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <nav className="flex items-center gap-2 text-sm">
      {isLoadingAuth ? null : isAuthenticated ? (
        <button
          type="button"
          onClick={() => {
            void handleLogout();
          }}
          disabled={isLoggingOut}
          className="rounded-full px-3 py-1.5 text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {isLoggingOut ? "Logout..." : "Logout"}
        </button>
      ) : (
        <Link href="/login" className={getNavLinkClassName(isLoginPage)}>
          Login
        </Link>
      )}
      {!isLoginPage && (
        <>
          <Link href="/select" className={getNavLinkClassName(isSelectPage)}>
            Select
          </Link>
          <Link href="/me" className={getNavLinkClassName(isMyPage)}>
            My page
          </Link>
        </>
      )}
    </nav>
  );
};
