"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type CategoryInfo = {
  category: string;
  levels: number[];
  count: number;
};

export const SelectForm = () => {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
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
    setSelectedCategories(categories.map((c) => c.category));
    setError("");
  };

  const deselectAllCategories = (): void => {
    setSelectedCategories([]);
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
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          読み込み中...
        </p>
      </section>
    );
  }

  const isAllSelected =
    categories.length > 0 &&
    selectedCategories.length === categories.length;

  return (
    <section className="mx-auto w-full max-w-2xl rounded-2xl border border-black/10 bg-white p-8 dark:border-white/15 dark:bg-black/50">
      <h1 className="mb-6 text-2xl font-semibold">問題条件を選択</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* カテゴリ選択 */}
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
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              {isAllSelected ? "すべて解除" : "すべて選択"}
            </button>
          </div>
          <div role="group" aria-label="カテゴリ選択" className="flex flex-wrap gap-2">
            {categories.map((cat) => {
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
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300"
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
        </div>

        {/* レベル選択 */}
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
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300"
                    : "border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-400 dark:hover:border-neutral-500"
                }`}
                disabled={isSubmitting}
              >
                Lv.{l}
              </button>
            ))}
          </div>
        </div>

        {/* 問題数 */}
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
            className="w-24 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
            disabled={isSubmitting}
          />
        </div>

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

        <button
          type="submit"
          disabled={isSubmitting || selectedCategories.length === 0}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {isSubmitting ? "作成中..." : "テストを開始"}
        </button>
      </form>
    </section>
  );
};
