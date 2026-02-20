"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  getPasswordPolicyErrorMessage,
  PASSWORD_POLICY_RULES,
} from "@/lib/auth/password-policy";

type Mode = "login" | "signup";

const LoginPage = () => {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): string | null => {
    if (!email.trim()) {
      return "メールアドレスを入力してください";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return "有効なメールアドレスを入力してください";
    }

    if (mode === "signup") {
      const passwordError = getPasswordPolicyErrorMessage(password);
      if (passwordError) {
        return passwordError;
      }
    } else if (!password) {
      return "パスワードを入力してください";
    }

    return null;
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint =
        mode === "signup" ? "/api/auth/signup" : "/api/auth/login";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };

        if (response.status === 409) {
          setError("このメールアドレスは既に登録されています");
        } else if (response.status === 401) {
          setError("メールアドレスまたはパスワードが正しくありません");
        } else {
          setError(
            data.message ?? "エラーが発生しました。もう一度お試しください",
          );
        }

        return;
      }

      router.push("/select");
    } catch {
      setError("通信に失敗しました。ネットワーク接続を確認してください");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = (): void => {
    setMode(mode === "login" ? "signup" : "login");
    setError("");
  };

  return (
    <div className="flex items-center justify-center py-12">
      <section className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-8 dark:border-white/15 dark:bg-black/50">
        <h1 className="mb-6 text-center text-2xl font-semibold">
          {mode === "login" ? "ログイン" : "アカウント作成"}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="example@email.com"
              className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              パスワード
            </label>
            <input
              id="password"
              type="password"
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8文字以上"
              className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
              disabled={isSubmitting}
            />
            {mode === "signup" && (
              <ul className="mt-2 space-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                {PASSWORD_POLICY_RULES.map((rule) => (
                  <li key={rule}>- {rule}</li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {isSubmitting
              ? "処理中..."
              : mode === "login"
                ? "ログイン"
                : "アカウント作成"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
          {mode === "login" ? (
            <>
              アカウントをお持ちでない方は{" "}
              <button
                type="button"
                onClick={toggleMode}
                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                新規登録
              </button>
            </>
          ) : (
            <>
              既にアカウントをお持ちの方は{" "}
              <button
                type="button"
                onClick={toggleMode}
                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                ログイン
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
