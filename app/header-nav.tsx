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
    return `whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
      isActive
        ? "border-neutral-300 bg-neutral-100 text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        : "border-transparent text-neutral-600 hover:border-neutral-200 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:bg-neutral-800"
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
    <nav className="flex items-center gap-1.5 sm:gap-2">
      {isLoadingAuth ? null : isAuthenticated ? (
        <button
          type="button"
          onClick={() => {
            void handleLogout();
          }}
          disabled={isLoggingOut}
          className="whitespace-nowrap rounded-full border border-transparent px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-200 hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:bg-neutral-800 sm:text-sm"
        >
          {isLoggingOut ? "ログアウト中..." : "ログアウト"}
        </button>
      ) : (
        <Link href="/login" className={getNavLinkClassName(isLoginPage)}>
          ログイン
        </Link>
      )}
      {!isLoginPage && (
        <>
          <Link href="/select" className={getNavLinkClassName(isSelectPage)}>
            問題選択
          </Link>
          <Link href="/me" className={getNavLinkClassName(isMyPage)}>
            マイページ
          </Link>
        </>
      )}
    </nav>
  );
};
