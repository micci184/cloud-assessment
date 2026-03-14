"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type CategoryInfo = {
  platform: string;
  exam: string;
  category: string;
  levels: number[];
  count: number;
};

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

export const SelectForm = () => {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [level, setLevel] = useState<number>(1);
  const [count, setCount] = useState<number>(5);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const fetchCategories = async (): Promise<void> => {
      try {
        const response = await fetch("/api/questions/categories");

        if (!response.ok) {
          setError("カテゴリの取得に失敗しました");
          return;
        }

        const data = (await response.json()) as { categories: CategoryInfo[] };
        setCategories(data.categories);
        if (data.categories.length > 0) {
          const firstCategory = data.categories[0];
          if (firstCategory) {
            setSelectedPlatform(firstCategory.platform);
            setSelectedExam(firstCategory.exam);
          }
        }
      } catch {
        setError("通信に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchCategories();
  }, []);

  useEffect(() => {
    if (error) {
      errorRef.current?.focus();
    }
  }, [error]);

  const toggleCategory = (category: string): void => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
    setError("");
  };

  const selectAllCategories = (): void => {
    setSelectedCategories(filteredCategories.map((c) => c.category));
    setError("");
  };

  const deselectAllCategories = (): void => {
    setSelectedCategories([]);
  };

  const handleStartCloudPractitioner = async (): Promise<void> => {
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
          count: 30,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setError(data.message ?? "エラーが発生しました");
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

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setError("");

    if (selectedCategories.length === 0) {
      setError("カテゴリを1つ以上選択してください");
      return;
    }

    if (count < 1 || count > 50) {
      setError("問題数は1〜50の範囲で入力してください");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/attempts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: selectedPlatform,
          exam: selectedExam,
          categories: selectedCategories,
          level,
          count,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setError(data.message ?? "エラーが発生しました");
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

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-neutral-600 dark:text-neutral-300"
        >
          読み込み中...
        </p>
      </section>
    );
  }

  const platforms = Array.from(new Set(categories.map((cat) => cat.platform)));
  const exams = Array.from(
    new Set(
      categories
        .filter((cat) => cat.platform === selectedPlatform)
        .map((cat) => cat.exam),
    ),
  );
  const filteredCategories = categories.filter(
    (cat) => cat.platform === selectedPlatform && cat.exam === selectedExam,
  );
  const isAllSelected =
    filteredCategories.length > 0 &&
    selectedCategories.length === filteredCategories.length;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">問題条件を選択</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          資格対策は推奨設定で開始、通常学習はカテゴリやレベルを自由に設定できます。
        </p>
      </header>

      {error && (
        <p
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          aria-live="assertive"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 outline-none dark:bg-red-900/20 dark:text-red-400"
        >
          {error}
        </p>
      )}

      <div className="space-y-4">
        <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
          <p className="text-xs font-semibold tracking-wide text-neutral-600 dark:text-neutral-300">
            カスタム学習
          </p>
          <h2 className="mt-2 text-xl font-semibold">自分で条件を決めて開始</h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            カテゴリ・レベル・問題数を自由に選んで学習します。
          </p>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                プラットフォーム
              </label>
              <div role="group" aria-label="プラットフォーム選択" className="flex flex-wrap gap-2">
                {platforms.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => {
                      setSelectedPlatform(platform);
                      const nextExam = categories.find(
                        (cat) => cat.platform === platform,
                      )?.exam;
                      if (nextExam) {
                        setSelectedExam(nextExam);
                      }
                      setSelectedCategories([]);
                      setError("");
                    }}
                    aria-pressed={selectedPlatform === platform}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                      selectedPlatform === platform
                        ? "border-brand-400 bg-brand-200/40 text-brand-700 dark:border-brand-300 dark:bg-brand-400/20 dark:text-brand-200"
                        : "border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-400 dark:hover:border-neutral-500"
                    }`}
                    disabled={isSubmitting}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                試験
              </label>
              <div role="group" aria-label="試験選択" className="flex flex-wrap gap-2">
                {exams.map((exam) => (
                  <button
                    key={exam}
                    type="button"
                    onClick={() => {
                      setSelectedExam(exam);
                      setSelectedCategories([]);
                      setError("");
                    }}
                    aria-pressed={selectedExam === exam}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                      selectedExam === exam
                        ? "border-brand-400 bg-brand-200/40 text-brand-700 dark:border-brand-300 dark:bg-brand-400/20 dark:text-brand-200"
                        : "border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-400 dark:hover:border-neutral-500"
                    }`}
                    disabled={isSubmitting}
                  >
                    {exam}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  カテゴリ
                </label>
                <button
                  type="button"
                  onClick={isAllSelected ? deselectAllCategories : selectAllCategories}
                  aria-pressed={isAllSelected}
                  aria-label={
                    isAllSelected
                      ? "カテゴリの全選択を解除"
                      : "カテゴリをすべて選択"
                  }
                  className="text-xs text-brand-600 hover:underline dark:text-brand-300"
                >
                  {isAllSelected ? "すべて解除" : "すべて選択"}
                </button>
              </div>
              <div role="group" aria-label="カテゴリ選択" className="flex flex-wrap gap-2">
                {filteredCategories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.category);

                  return (
                    <button
                      key={cat.category}
                      type="button"
                      onClick={() => toggleCategory(cat.category)}
                      aria-pressed={isSelected}
                      aria-label={`${cat.category}（${cat.count}問）${isSelected ? "選択中" : "未選択"}`}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                        isSelected
                          ? "border-brand-400 bg-brand-200/40 text-brand-700 dark:border-brand-300 dark:bg-brand-400/20 dark:text-brand-200"
                          : "border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-400 dark:hover:border-neutral-500"
                      }`}
                      disabled={isSubmitting}
                    >
                      {cat.category}
                      <span className="ml-1 text-xs opacity-60">({cat.count})</span>
                    </button>
                  );
                })}
              </div>
              {filteredCategories.length === 0 && (
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                  条件に一致するカテゴリがありません。
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                レベル
              </label>
              <div role="group" aria-label="レベル選択" className="flex gap-2">
                {[1, 2, 3].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLevel(l)}
                    aria-pressed={level === l}
                    aria-label={`レベル ${l}${level === l ? "（選択中）" : ""}`}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                      level === l
                        ? "border-brand-400 bg-brand-200/40 text-brand-700 dark:border-brand-300 dark:bg-brand-400/20 dark:text-brand-200"
                        : "border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-400 dark:hover:border-neutral-500"
                    }`}
                    disabled={isSubmitting}
                  >
                    Lv.{l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="count"
                className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                問題数
              </label>
              <input
                id="count"
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                className="w-24 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-300/30 dark:border-neutral-600 dark:focus:border-brand-300 dark:focus:ring-brand-300/30"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || selectedCategories.length === 0}
              className="rounded-lg bg-brand-300 px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-400 dark:text-white dark:hover:bg-brand-500"
            >
              {isSubmitting ? "作成中..." : "テストを開始"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
          <p className="text-xs font-semibold tracking-wide text-neutral-600 dark:text-neutral-300">
            資格対策
          </p>
          <h2 className="mt-2 text-xl font-semibold">Cloud Practitioner</h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            AWS Certified Cloud Practitioner 想定の出題範囲で、30問のテストを開始します。
          </p>
          <button
            type="button"
            onClick={() => {
              void handleStartCloudPractitioner();
            }}
            disabled={isSubmitting}
            className="mt-5 w-full rounded-lg bg-brand-300 px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-400 dark:text-white dark:hover:bg-brand-500"
          >
            {isSubmitting ? "作成中..." : "テストを開始"}
          </button>
        </section>
      </div>
    </div>
  );
};
