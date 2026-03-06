"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CLOUD_PRACTITIONER_CATEGORIES = [
  "VPC",
  "EC2",
  "S3",
  "IAM",
  "CloudWatch",
  "CloudTrail",
  "RDS",
  "Lambda",
] as const;

const COUNT_OPTIONS = [10, 20, 30, 40, 50] as const;

export const CloudPractitionerSelectForm = () => {
  const router = useRouter();
  const [count, setCount] = useState<number>(30);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStart = async (): Promise<void> => {
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/attempts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preset: "cloud-practitioner",
          categories: CLOUD_PRACTITIONER_CATEGORIES,
          levels: [1, 2, 3],
          count,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setError(data.message ?? "受験の作成に失敗しました");
        return;
      }

      const data = (await response.json()) as { attemptId: string };
      router.push(`/quiz/${data.attemptId}`);
    } catch {
      setError("通信に失敗しました。ネットワーク接続を確認してください");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-2xl rounded-2xl border border-black/10 bg-white p-8 dark:border-white/15 dark:bg-black/50">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
        AWS CLF-C02
      </p>
      <h1 className="text-2xl font-semibold">Cloud Practitioner専用モード</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Cloud Practitionerで頻出のカテゴリを横断して出題します。通常モードより試験対策に寄せた設定です。
      </p>

      <div className="mt-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
        <h2 className="text-sm font-semibold">出題設定（固定）</h2>
        <ul className="mt-2 space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
          <li>カテゴリ: {CLOUD_PRACTITIONER_CATEGORIES.join(" / ")}</li>
          <li>レベル: Lv.1 - Lv.3（混在）</li>
          <li>問題形式: 単一選択 + 複数選択</li>
        </ul>
      </div>

      <div className="mt-6">
        <p className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          問題数
        </p>
        <div className="flex flex-wrap gap-2">
          {COUNT_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCount(option)}
              aria-pressed={count === option}
              disabled={isSubmitting}
              className={`rounded-lg border px-4 py-2 text-sm transition ${
                count === option
                  ? "border-brand-400 bg-brand-200/40 text-brand-700 dark:border-brand-300 dark:bg-brand-400/20 dark:text-brand-200"
                  : "border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-400 dark:hover:border-neutral-500"
              }`}
            >
              {option}問
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          aria-live="assertive"
          className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
        >
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleStart}
          disabled={isSubmitting}
          className="rounded-lg bg-brand-300 px-5 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-400 dark:text-white dark:hover:bg-brand-500"
        >
          {isSubmitting ? "作成中..." : "専用モードで開始"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/select")}
          disabled={isSubmitting}
          className="rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-medium transition hover:border-neutral-400 dark:border-neutral-600 dark:hover:border-neutral-500"
        >
          通常モードへ戻る
        </button>
      </div>
    </section>
  );
};
