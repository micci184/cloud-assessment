"use client";

import { useRouter } from "next/navigation";

import type { AttemptData } from "../types";

type ResultViewProps = {
  attempt: AttemptData;
};

export const ResultView = ({ attempt }: ResultViewProps) => {
  const router = useRouter();
  const result = attempt.result;

  if (!result) return null;

  const breakdown = result.categoryBreakdown;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm dark:border-white/15 dark:bg-black/50">
        <h1 className="mb-2 text-center text-2xl font-semibold">テスト結果</h1>
        <p className="mb-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
          全{attempt.questions.length}問
        </p>

        <div className="mb-8 text-center">
          <p className="mb-1 text-xs tracking-wide text-neutral-500 dark:text-neutral-400">
            達成率
          </p>
          <span className="text-6xl font-bold text-brand-600 dark:text-brand-300">
            {result.overallPercent}
          </span>
          <span className="ml-1 text-3xl text-neutral-500">%</span>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            カテゴリ別正答率
          </h2>
          {breakdown.map((cat) => (
            <div key={cat.category} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-sm text-neutral-600 dark:text-neutral-400">
                {cat.category}
              </span>
              <div className="flex-1">
                <div className="h-4 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                  <div
                    className="h-full rounded-full bg-brand-400 transition-all dark:bg-brand-300"
                    style={{ width: `${cat.percent}%` }}
                  />
                </div>
              </div>
              <span className="w-20 text-right text-sm font-medium">
                {cat.correct}/{cat.total} ({cat.percent}%)
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">問題一覧</h2>
        {attempt.questions.map((q) => (
          <div
            key={q.attemptQuestionId}
            className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/15 dark:bg-black/50"
          >
            <div className="mb-2 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="rounded bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
                Q{q.order}
              </span>
              <span className="rounded bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
                {q.question.category}
              </span>
              <span
                className={`rounded px-2 py-0.5 ${
                  q.isCorrect
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {q.isCorrect ? "正解" : "不正解"}
              </span>
            </div>

            <p className="mb-3 text-sm leading-relaxed">
              {q.question.questionText}
            </p>

            <div className="mb-3 flex flex-col gap-1.5">
              {q.question.choices.map((choice, i) => {
                const answerIndices =
                  q.question.answerIndices && q.question.answerIndices.length > 0
                    ? q.question.answerIndices
                    : q.question.answerIndex !== undefined
                      ? [q.question.answerIndex]
                      : [];
                const selectedIndices =
                  q.selectedIndices && q.selectedIndices.length > 0
                    ? q.selectedIndices
                    : q.selectedIndex !== null
                      ? [q.selectedIndex]
                      : [];
                const isAnswer = answerIndices.includes(i);
                const isUserChoice = selectedIndices.includes(i);

                return (
                  <div
                    key={i}
                    className={`rounded-lg px-3 py-2.5 text-sm ${
                      isAnswer
                        ? "border border-green-400 bg-green-50 text-green-900 dark:border-green-700 dark:bg-green-900/25 dark:text-green-100"
                        : isUserChoice && !isAnswer
                          ? "border border-red-400 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-900/25 dark:text-red-100"
                          : "border border-neutral-200 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    <span className="mr-2 font-medium">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {choice}
                    {isAnswer && (
                      <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                        ✓ 正解
                      </span>
                    )}
                    {isUserChoice && !isAnswer && (
                      <span className="ml-2 text-xs text-red-600 dark:text-red-400">
                        × あなたの回答
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {q.question.explanation && (
              <div className="rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-400">
                <span className="font-medium">解説: </span>
                {q.question.explanation}
              </div>
            )}
          </div>
        ))}
      </section>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push("/select")}
          className="rounded-lg bg-brand-300 px-6 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-brand-400 dark:bg-brand-400 dark:text-white dark:hover:bg-brand-500"
        >
          もう一度テストする
        </button>
        <button
          type="button"
          onClick={() => router.push("/me")}
          className="rounded-lg border border-neutral-300 px-6 py-2.5 text-sm font-medium transition hover:border-neutral-400 dark:border-neutral-600 dark:hover:border-neutral-500"
        >
          マイページ
        </button>
      </div>
    </div>
  );
};
