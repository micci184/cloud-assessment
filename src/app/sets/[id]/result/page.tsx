"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import { mockQuizSets } from "@/lib/mock-data";

export default function ResultPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const setId = params.id as string;

  const [showReview, setShowReview] = useState(false);

  const set = useMemo(
    () => mockQuizSets.find((s) => s.id === setId),
    [setId]
  );

  const answers: Record<string, string> = useMemo(() => {
    try {
      const answersParam = searchParams.get("answers");
      if (answersParam) {
        return JSON.parse(decodeURIComponent(answersParam));
      }
    } catch {
      // ignore parse errors
    }
    return {};
  }, [searchParams]);

  // Not found
  if (!set) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            セットが見つかりません
          </h1>
          <Link
            href="/"
            className="mt-4 inline-block text-indigo-600 hover:underline dark:text-indigo-400"
          >
            ダッシュボードに戻る
          </Link>
        </div>
      </div>
    );
  }

  const questions = set.questions;
  const totalQuestions = questions.length;

  // Calculate score
  const correctCount = questions.filter(
    (q) => answers[q.id] === q.correctChoiceId
  ).length;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Determine result color
  const getResultColor = () => {
    if (percentage >= 80) return "text-green-600 dark:text-green-400";
    if (percentage >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            結果
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">{set.title}</p>
        </header>

        {/* Score Card */}
        <article className="mb-8 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className={`text-6xl font-bold ${getResultColor()} sm:text-7xl`}>
            {correctCount}
            <span className="text-3xl text-slate-400 dark:text-slate-500 sm:text-4xl">
              {" "}
              / {totalQuestions}
            </span>
          </div>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
            正解率: {percentage}%
          </p>

          {/* Message */}
          <p className="mt-4 text-slate-700 dark:text-slate-300">
            {percentage >= 80
              ? "🎉 素晴らしい！"
              : percentage >= 60
              ? "👍 いい調子です！"
              : "💪 もう少し頑張ろう！"}
          </p>
        </article>

        {/* Action Buttons */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href={`/sets/${setId}/quiz`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-xl"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Retry
          </Link>
          <button
            type="button"
            onClick={() => setShowReview(!showReview)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-700"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            {showReview ? "Review を閉じる" : "Review"}
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-700"
          >
            ダッシュボードに戻る
          </Link>
        </div>

        {/* Review Section */}
        {showReview && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
              Review
            </h2>
            {questions.map((q, index) => {
              const userAnswer = answers[q.id];
              const isCorrect = userAnswer === q.correctChoiceId;
              const userChoice = q.choices.find((c) => c.id === userAnswer);
              const correctChoice = q.choices.find(
                (c) => c.id === q.correctChoiceId
              );

              return (
                <article
                  key={q.id}
                  className={`rounded-xl border-2 p-5 ${
                    isCorrect
                      ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                      : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                  }`}
                >
                  {/* Question Header */}
                  <div className="mb-3 flex items-start gap-3">
                    <span
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                        isCorrect ? "bg-green-500" : "bg-red-500"
                      }`}
                    >
                      {isCorrect ? "○" : "×"}
                    </span>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Question {index + 1}
                      </p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {q.text}
                      </p>
                    </div>
                  </div>

                  {/* Answers */}
                  <div className="ml-10 space-y-2 text-sm">
                    <p>
                      <span className="font-medium text-slate-600 dark:text-slate-400">
                        あなたの回答:{" "}
                      </span>
                      <span
                        className={
                          isCorrect
                            ? "text-green-700 dark:text-green-300"
                            : "text-red-700 dark:text-red-300"
                        }
                      >
                        {userChoice?.text ?? "未回答"}
                      </span>
                    </p>
                    {!isCorrect && (
                      <p>
                        <span className="font-medium text-slate-600 dark:text-slate-400">
                          正解:{" "}
                        </span>
                        <span className="text-green-700 dark:text-green-300">
                          {correctChoice?.text}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Explanation */}
                  <div className="mt-4 ml-10 rounded-lg bg-white/60 p-4 dark:bg-slate-800/60">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      💡 解説
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {q.explanation}
                    </p>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
