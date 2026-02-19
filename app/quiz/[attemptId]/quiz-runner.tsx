"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type QuestionData = {
  attemptQuestionId: string;
  order: number;
  selectedIndex: number | null;
  isCorrect: boolean | null;
  question: {
    id: string;
    category: string;
    level: number;
    questionText: string;
    choices: string[];
    answerIndex?: number;
    explanation?: string;
  };
};

type CategoryScore = {
  category: string;
  total: number;
  correct: number;
  percent: number;
};

type ResultData = {
  overallPercent: number;
  categoryBreakdown: CategoryScore[];
};

type AttemptData = {
  id: string;
  status: "IN_PROGRESS" | "COMPLETED";
  questions: QuestionData[];
  result: ResultData | null;
};

type Props = {
  attemptId: string;
};

export function QuizRunner({ attemptId }: Props) {
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchAttempt = useCallback(async () => {
    try {
      const response = await fetch(`/api/attempts/${attemptId}`);

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setError(data.message ?? "データの取得に失敗しました");
        return;
      }

      const data = (await response.json()) as AttemptData;
      setAttempt(data);

      if (data.status === "IN_PROGRESS") {
        const firstUnanswered = data.questions.findIndex(
          (q) => q.selectedIndex === null,
        );
        setCurrentIndex(
          firstUnanswered === -1 ? data.questions.length - 1 : firstUnanswered,
        );
      }
    } catch {
      setError("通信に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    void fetchAttempt();
  }, [fetchAttempt]);

  async function handleAnswer() {
    if (selectedChoice === null || !attempt) return;

    const currentQuestion = attempt.questions[currentIndex];
    if (!currentQuestion) return;

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/attempts/${attemptId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptQuestionId: currentQuestion.attemptQuestionId,
          selectedIndex: selectedChoice,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setError(data.message ?? "回答の送信に失敗しました");
        return;
      }

      const result = (await response.json()) as {
        attemptQuestionId: string;
        selectedIndex: number;
        isCorrect: boolean;
      };

      setAttempt((prev) => {
        if (!prev) return prev;

        const updatedQuestions = prev.questions.map((q) =>
          q.attemptQuestionId === result.attemptQuestionId
            ? {
                ...q,
                selectedIndex: result.selectedIndex,
                isCorrect: result.isCorrect,
              }
            : q,
        );

        return { ...prev, questions: updatedQuestions };
      });

      setSelectedChoice(null);

      if (currentIndex < attempt.questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    } catch {
      setError("通信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFinalize() {
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/attempts/${attemptId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setError(data.message ?? "採点に失敗しました");
        return;
      }

      await fetchAttempt();
    } catch {
      setError("通信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          読み込み中...
        </p>
      </section>
    );
  }

  if (error && !attempt) {
    return (
      <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </section>
    );
  }

  if (!attempt) return null;

  if (attempt.status === "COMPLETED" && attempt.result) {
    return <ResultView attempt={attempt} />;
  }

  const allAnswered = attempt.questions.every((q) => q.selectedIndex !== null);
  const currentQuestion = attempt.questions[currentIndex];

  if (!currentQuestion) return null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* 進捗バー */}
      <div className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400">
        <span>
          問題 {currentIndex + 1} / {attempt.questions.length}
        </span>
        <span>
          回答済み:{" "}
          {attempt.questions.filter((q) => q.selectedIndex !== null).length} /{" "}
          {attempt.questions.length}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{
            width: `${(attempt.questions.filter((q) => q.selectedIndex !== null).length / attempt.questions.length) * 100}%`,
          }}
        />
      </div>

      {/* 問題カード */}
      <section className="rounded-2xl border border-black/10 bg-white p-8 dark:border-white/15 dark:bg-black/50">
        <div className="mb-4 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="rounded bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
            {currentQuestion.question.category}
          </span>
          <span className="rounded bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
            Lv.{currentQuestion.question.level}
          </span>
        </div>

        <h2 className="mb-6 text-lg font-medium leading-relaxed">
          {currentQuestion.question.questionText}
        </h2>

        <div className="flex flex-col gap-3">
          {(currentQuestion.question.choices as string[]).map(
            (choice, index) => {
              const isSelected =
                selectedChoice === index ||
                (currentQuestion.selectedIndex === index &&
                  selectedChoice === null);

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    if (currentQuestion.selectedIndex === null) {
                      setSelectedChoice(index);
                    }
                  }}
                  disabled={
                    currentQuestion.selectedIndex !== null || isSubmitting
                  }
                  className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300"
                      : "border-neutral-300 text-neutral-700 hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-300 dark:hover:border-neutral-500"
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  <span className="mr-2 font-medium">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {choice}
                </button>
              );
            },
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setCurrentIndex(Math.max(0, currentIndex - 1));
                setSelectedChoice(null);
              }}
              disabled={currentIndex === 0}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:hover:border-neutral-500"
            >
              前へ
            </button>
            {currentQuestion.selectedIndex !== null &&
              currentIndex < attempt.questions.length - 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentIndex(currentIndex + 1);
                    setSelectedChoice(null);
                  }}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:border-neutral-400 dark:border-neutral-600 dark:hover:border-neutral-500"
                >
                  次へ
                </button>
              )}
          </div>

          {currentQuestion.selectedIndex === null && (
            <button
              type="button"
              onClick={handleAnswer}
              disabled={selectedChoice === null || isSubmitting}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {isSubmitting ? "送信中..." : "回答する"}
            </button>
          )}

          {allAnswered && (
            <button
              type="button"
              onClick={handleFinalize}
              disabled={isSubmitting}
              className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-500 dark:hover:bg-green-600"
            >
              {isSubmitting ? "採点中..." : "採点する"}
            </button>
          )}
        </div>
      </section>

      {/* 問題ナビゲーション */}
      <div className="flex flex-wrap gap-2">
        {attempt.questions.map((q, i) => (
          <button
            key={q.attemptQuestionId}
            type="button"
            onClick={() => {
              setCurrentIndex(i);
              setSelectedChoice(null);
            }}
            className={`h-8 w-8 rounded text-xs font-medium transition ${
              i === currentIndex
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : q.selectedIndex !== null
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
            }`}
          >
            {q.order}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultView({ attempt }: { attempt: AttemptData }) {
  const router = useRouter();
  const result = attempt.result;

  if (!result) return null;

  const breakdown = result.categoryBreakdown as CategoryScore[];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <section className="rounded-2xl border border-black/10 bg-white p-8 dark:border-white/15 dark:bg-black/50">
        <h1 className="mb-2 text-center text-2xl font-semibold">テスト結果</h1>
        <p className="mb-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
          全{attempt.questions.length}問
        </p>

        <div className="mb-8 text-center">
          <span className="text-5xl font-bold text-blue-600 dark:text-blue-400">
            {result.overallPercent}
          </span>
          <span className="ml-1 text-2xl text-neutral-500">%</span>
        </div>

        {/* カテゴリ別 */}
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
                <div className="h-3 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
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

      {/* 問題一覧（解説付き） */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">問題一覧</h2>
        {attempt.questions.map((q) => (
          <div
            key={q.attemptQuestionId}
            className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50"
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
              {(q.question.choices as string[]).map((choice, i) => {
                const isAnswer = i === q.question.answerIndex;
                const isUserChoice = i === q.selectedIndex;

                return (
                  <div
                    key={i}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      isAnswer
                        ? "border border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                        : isUserChoice && !isAnswer
                          ? "border border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20"
                          : "border border-transparent"
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
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
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
}
