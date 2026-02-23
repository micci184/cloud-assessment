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

  useEffect(() => {
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
  }, [pathname]);

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
    <nav className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-300">
      {isLoadingAuth ? null : isAuthenticated ? (
        <button
          type="button"
          onClick={() => {
            void handleLogout();
          }}
          disabled={isLoggingOut}
          className="disabled:opacity-60"
        >
          {isLoggingOut ? "Logout..." : "Logout"}
        </button>
      ) : (
        <Link href="/login">Login</Link>
      )}
      {!isLoginPage && (
        <>
          <Link href="/select">Select</Link>
          <Link href="/me">Me</Link>
        </>
      )}
    </nav>
  );
};
