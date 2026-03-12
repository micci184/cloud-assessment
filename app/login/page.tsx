"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  getPasswordPolicyErrorMessage,
  PASSWORD_POLICY_RULES,
} from "@/lib/auth/password-policy";

type Mode = "login" | "signup";
type FieldErrors = {
  email?: string;
  password?: string;
  form?: string;
};

const LoginPage = () => {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const formErrorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    if (errors.form) {
      formErrorRef.current?.focus();
    }
  }, [errors.form]);

  const validateForm = (): FieldErrors => {
    if (!email.trim()) {
      return { email: "メールアドレスを入力してください" };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return { email: "有効なメールアドレスを入力してください" };
    }

    if (mode === "signup") {
      const passwordError = getPasswordPolicyErrorMessage(password);
      if (passwordError) {
        return { password: passwordError };
      }
    } else if (!password) {
      return { password: "パスワードを入力してください" };
    }

    return {};
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setErrors({});

    const validationErrors = validateForm();

    if (validationErrors.email || validationErrors.password) {
      setErrors(validationErrors);
      if (validationErrors.email) {
        emailInputRef.current?.focus();
      } else {
        passwordInputRef.current?.focus();
      }
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

        if (mode === "signup" && response.status === 400) {
          setErrors({
            form: "アカウント作成に失敗しました。入力内容をご確認ください",
          });
        } else if (response.status === 401) {
          setErrors({ form: "メールアドレスまたはパスワードが正しくありません" });
        } else if (response.status === 429) {
          setErrors({
            form: "試行回数が上限に達しました。時間をおいて再試行してください",
          });
        } else {
          setErrors({
            form: data.message ?? "エラーが発生しました。もう一度お試しください",
          });
        }

        return;
      }

      router.push("/select");
    } catch {
      setErrors({
        form: "通信に失敗しました。ネットワーク接続を確認してください",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = (): void => {
    setMode(mode === "login" ? "signup" : "login");
    setErrors({});
  };

  return (
    <div className="relative isolate flex items-center justify-center py-10 sm:py-14">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-4 top-6 h-24 w-24 rounded-3xl border border-brand-300/40 bg-brand-200/20 dark:border-brand-400/35 dark:bg-brand-400/10 sm:left-12 sm:top-10 sm:h-28 sm:w-28" />
        <div className="absolute right-4 top-20 h-16 w-16 rounded-2xl border border-black/10 bg-white/70 dark:border-white/15 dark:bg-black/40 sm:right-16 sm:h-20 sm:w-20" />
        <div className="absolute bottom-8 left-1/2 h-10 w-10 -translate-x-1/2 rounded-lg border border-brand-300/40 bg-brand-200/30 dark:border-brand-400/35 dark:bg-brand-400/10" />
      </div>

      <section className="w-full max-w-md rounded-3xl border border-black/10 bg-white/95 p-7 shadow-[0_16px_40px_-24px_rgba(23,23,23,0.45)] dark:border-white/15 dark:bg-black/55 dark:shadow-[0_18px_42px_-24px_rgba(0,0,0,0.85)] sm:p-8">
        <p className="mb-2 inline-flex rounded-full border border-brand-300/60 bg-brand-200/20 px-2.5 py-1 text-[11px] font-medium tracking-wide text-brand-700 dark:border-brand-400/50 dark:bg-brand-400/15 dark:text-brand-200">
          Cloud Assessment
        </p>
        <h1 className="text-2xl font-semibold sm:text-[1.7rem]">
          {mode === "login" ? "ログイン" : "アカウント作成"}
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          {mode === "login"
            ? "学習を再開するために、メールアドレスとパスワードを入力してください。"
            : "はじめて利用する場合は、アカウントを作成してください。"}
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
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
              className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-300/30 dark:border-neutral-600 dark:bg-black/20 dark:focus:border-brand-300 dark:focus:ring-brand-300/30"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              required
              ref={emailInputRef}
              disabled={isSubmitting}
            />
            {errors.email && (
              <p id="email-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.email}
              </p>
            )}
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
              className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-300/30 dark:border-neutral-600 dark:bg-black/20 dark:focus:border-brand-300 dark:focus:ring-brand-300/30"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                mode === "signup"
                  ? errors.password
                    ? "password-policy password-error"
                    : "password-policy"
                  : errors.password
                    ? "password-error"
                    : undefined
              }
              required
              ref={passwordInputRef}
              disabled={isSubmitting}
            />
            {errors.password && (
              <p
                id="password-error"
                className="mt-1 text-sm text-red-600 dark:text-red-400"
              >
                {errors.password}
              </p>
            )}
            {mode === "signup" && (
              <ul
                id="password-policy"
                className="mt-2 space-y-1 text-xs text-neutral-500 dark:text-neutral-400"
              >
                {PASSWORD_POLICY_RULES.map((rule) => (
                  <li key={rule}>- {rule}</li>
                ))}
              </ul>
            )}
          </div>

          {errors.form && (
            <p
              ref={formErrorRef}
              tabIndex={-1}
              role="alert"
              aria-live="assertive"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 outline-none dark:bg-red-900/20 dark:text-red-400"
            >
              {errors.form}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-3 w-full rounded-xl bg-brand-300 px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-400 dark:text-white dark:hover:bg-brand-500"
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
                className="font-medium text-brand-600 hover:underline dark:text-brand-300"
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
                className="font-medium text-brand-600 hover:underline dark:text-brand-300"
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
