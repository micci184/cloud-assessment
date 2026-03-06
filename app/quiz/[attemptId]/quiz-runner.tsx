"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { CategoryScore } from "@/lib/quiz/types";

type QuestionData = {
  attemptQuestionId: string;
  order: number;
  choiceOrder?: number[];
  selectedIndex: number | null;
  selectedIndices: number[] | null;
  isCorrect: boolean | null;
  question: {
    id: string;
    category: string;
    level: number;
    questionType: "SINGLE" | "MULTIPLE";
    questionText: string;
    choices: string[];
    answerIndex?: number;
    answerIndices?: number[];
    explanation?: string;
  };
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

export const QuizRunner = ({ attemptId }: Props) => {
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [draftSelectedChoices, setDraftSelectedChoices] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const choiceButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const questionNavButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const questionTitleRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

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
          (q) =>
            q.selectedIndex === null &&
            (!q.selectedIndices || q.selectedIndices.length === 0),
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

  useEffect(() => {
    questionTitleRef.current?.focus();
  }, [currentIndex]);

  useEffect(() => {
    if (error) {
      errorRef.current?.focus();
    }
  }, [error]);

  useEffect(() => {
    if (!attempt) {
      return;
    }

    const currentQuestion = attempt.questions[currentIndex];
    if (!currentQuestion) {
      setDraftSelectedChoices([]);
      return;
    }

    const choiceOrder = getChoiceOrder(currentQuestion);
    const selectedOriginalIndices = getSelectedOriginalIndices(currentQuestion);
    const selectedDisplayIndices = selectedOriginalIndices
      .map((originalIndex) => choiceOrder.indexOf(originalIndex))
      .filter((displayIndex) => displayIndex >= 0)
      .sort((a, b) => a - b);

    setDraftSelectedChoices(selectedDisplayIndices);
  }, [attempt, currentIndex]);

  const isMultipleChoiceQuestion = (question: QuestionData): boolean => {
    return question.question.questionType === "MULTIPLE";
  };

  const getSelectedOriginalIndices = (question: QuestionData): number[] => {
    if (question.selectedIndices && question.selectedIndices.length > 0) {
      return [...question.selectedIndices].sort((a, b) => a - b);
    }

    if (question.selectedIndex !== null) {
      return [question.selectedIndex];
    }

    return [];
  };

  const isQuestionAnswered = (question: QuestionData): boolean => {
    return getSelectedOriginalIndices(question).length > 0;
  };

  const handleAnswer = async (): Promise<void> => {
    if (draftSelectedChoices.length === 0 || !attempt) return;

    const currentQuestion = attempt.questions[currentIndex];
    if (!currentQuestion) return;
    const choiceOrder = getChoiceOrder(currentQuestion);
    const selectedOriginalIndices = draftSelectedChoices
      .map((displayIndex) => choiceOrder[displayIndex])
      .filter((originalIndex): originalIndex is number => originalIndex !== undefined)
      .sort((a, b) => a - b);

    if (selectedOriginalIndices.length !== draftSelectedChoices.length) {
      setError("選択肢の状態が不正です。再読み込みしてください");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/attempts/${attemptId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptQuestionId: currentQuestion.attemptQuestionId,
          ...(isMultipleChoiceQuestion(currentQuestion)
            ? { selectedIndices: selectedOriginalIndices }
            : { selectedIndex: selectedOriginalIndices[0] }),
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setError(data.message ?? "回答の送信に失敗しました");
        return;
      }

      const result = (await response.json()) as {
        attemptQuestionId: string;
        selectedIndex: number | null;
        selectedIndices?: number[] | null;
      };

      setAttempt((prev) => {
        if (!prev) return prev;

        const updatedQuestions = prev.questions.map((q) =>
          q.attemptQuestionId === result.attemptQuestionId
            ? {
                ...q,
                selectedIndex: result.selectedIndex,
                selectedIndices:
                  result.selectedIndices && result.selectedIndices.length > 0
                    ? result.selectedIndices
                    : result.selectedIndex !== null
                      ? [result.selectedIndex]
                      : null,
              }
            : q,
        );

        return { ...prev, questions: updatedQuestions };
      });

      setDraftSelectedChoices([]);

      if (currentIndex < attempt.questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    } catch {
      setError("通信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalize = async (): Promise<void> => {
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
  };

  const handleChoiceKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    choiceIndex: number,
    choiceCount: number,
    canAnswer: boolean,
    isMultipleChoice: boolean,
  ): void => {
    if (!canAnswer) {
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      const nextIndex = (choiceIndex + 1) % choiceCount;
      if (!isMultipleChoice) {
        setDraftSelectedChoices([nextIndex]);
      }
      choiceButtonRefs.current[nextIndex]?.focus();
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      const prevIndex = (choiceIndex - 1 + choiceCount) % choiceCount;
      if (!isMultipleChoice) {
        setDraftSelectedChoices([prevIndex]);
      }
      choiceButtonRefs.current[prevIndex]?.focus();
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      if (!isMultipleChoice) {
        setDraftSelectedChoices([0]);
      }
      choiceButtonRefs.current[0]?.focus();
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const lastIndex = choiceCount - 1;
      if (!isMultipleChoice) {
        setDraftSelectedChoices([lastIndex]);
      }
      choiceButtonRefs.current[lastIndex]?.focus();
    }
  };

  const moveQuestionByKeyboard = (nextIndex: number): void => {
    if (!attempt) {
      return;
    }

    const clampedIndex = Math.max(0, Math.min(nextIndex, attempt.questions.length - 1));
    setCurrentIndex(clampedIndex);
    setDraftSelectedChoices([]);
    questionNavButtonRefs.current[clampedIndex]?.focus();
  };

  const getChoiceOrder = (question: QuestionData): number[] => {
    const choicesCount = question.question.choices.length;
    const fallbackOrder = Array.from(
      { length: choicesCount },
      (_, index) => index,
    );
    const choiceOrder = question.choiceOrder;

    if (!choiceOrder || choiceOrder.length !== choicesCount) {
      return fallbackOrder;
    }

    const hasOutOfRange = choiceOrder.some(
      (index) => index < 0 || index >= choicesCount,
    );
    if (hasOutOfRange) {
      return fallbackOrder;
    }

    if (new Set(choiceOrder).size !== choicesCount) {
      return fallbackOrder;
    }

    return choiceOrder;
  };

  const handleQuestionNavKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    questionIndex: number,
  ): void => {
    if (!attempt) {
      return;
    }

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      moveQuestionByKeyboard(questionIndex + 1);
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      moveQuestionByKeyboard(questionIndex - 1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      moveQuestionByKeyboard(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      moveQuestionByKeyboard(attempt.questions.length - 1);
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

  if (error && !attempt) {
    return (
      <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
        <p
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          aria-live="assertive"
          className="text-sm text-red-600 outline-none dark:text-red-400"
        >
          {error}
        </p>
      </section>
    );
  }

  if (!attempt) return null;

  if (attempt.status === "COMPLETED" && attempt.result) {
    return <ResultView attempt={attempt} />;
  }

  const allAnswered = attempt.questions.every((q) => isQuestionAnswered(q));
  const currentQuestion = attempt.questions[currentIndex];
  const currentChoiceOrder = currentQuestion
    ? getChoiceOrder(currentQuestion)
    : [];
  const isCurrentMultiple = currentQuestion
    ? isMultipleChoiceQuestion(currentQuestion)
    : false;

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
          {attempt.questions.filter((q) => isQuestionAnswered(q)).length} /{" "}
          {attempt.questions.length}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
        <div
          className="h-full rounded-full bg-brand-400 transition-all dark:bg-brand-300"
          style={{
            width: `${(attempt.questions.filter((q) => isQuestionAnswered(q)).length / attempt.questions.length) * 100}%`,
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
          <span className="rounded bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
            {isCurrentMultiple ? "複数選択" : "単一選択"}
          </span>
        </div>

        <h2
          ref={questionTitleRef}
          tabIndex={-1}
          className="mb-6 text-lg font-medium leading-relaxed outline-none"
        >
          {currentQuestion.question.questionText}
        </h2>

        {isCurrentMultiple && (
          <p className="mb-3 rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            複数選択問題です。正しいと思う選択肢をすべて選んでから「回答する」を押してください。
          </p>
        )}
        <div
          role={isCurrentMultiple ? "group" : "radiogroup"}
          aria-label={`問題 ${currentIndex + 1} の選択肢`}
          className="flex flex-col gap-3"
        >
          {currentChoiceOrder.map((originalIndex, index) => {
              const choice = currentQuestion.question.choices[originalIndex];
              const canAnswer =
                !isQuestionAnswered(currentQuestion) && !isSubmitting;
              const isSelected = draftSelectedChoices.includes(index);

              return (
                <button
                  key={index}
                  type="button"
                  ref={(element) => {
                    choiceButtonRefs.current[index] = element;
                  }}
                  onClick={() => {
                    if (!canAnswer) {
                      return;
                    }

                    if (isCurrentMultiple) {
                      setDraftSelectedChoices((prev) =>
                        prev.includes(index)
                          ? prev.filter((value) => value !== index)
                          : [...prev, index].sort((a, b) => a - b),
                      );
                    } else {
                      setDraftSelectedChoices([index]);
                    }
                  }}
                  onKeyDown={(event) => {
                    handleChoiceKeyDown(
                      event,
                      index,
                      currentChoiceOrder.length,
                      canAnswer,
                      isCurrentMultiple,
                    );
                  }}
                  role={isCurrentMultiple ? "checkbox" : "radio"}
                  aria-checked={isSelected}
                  aria-disabled={!canAnswer}
                  disabled={!canAnswer}
                  className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
                    isSelected
                      ? "border-brand-400 bg-brand-200/40 text-brand-700 dark:border-brand-300 dark:bg-brand-400/20 dark:text-brand-200"
                      : "border-neutral-300 text-neutral-700 hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-300 dark:hover:border-neutral-500"
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  <span className="mr-2 font-medium">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {choice}
                </button>
              );
            })}
        </div>

        {error && (
          <p
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            aria-live="assertive"
            className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 outline-none dark:bg-red-900/20 dark:text-red-400"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setCurrentIndex(Math.max(0, currentIndex - 1));
                setDraftSelectedChoices([]);
              }}
              disabled={currentIndex === 0}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:hover:border-neutral-500"
            >
              前へ
            </button>
            {isQuestionAnswered(currentQuestion) &&
              currentIndex < attempt.questions.length - 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentIndex(currentIndex + 1);
                    setDraftSelectedChoices([]);
                  }}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:border-neutral-400 dark:border-neutral-600 dark:hover:border-neutral-500"
                >
                  次へ
                </button>
              )}
          </div>

          {!isQuestionAnswered(currentQuestion) && (
            <button
              type="button"
              onClick={handleAnswer}
              disabled={draftSelectedChoices.length === 0 || isSubmitting}
              className="rounded-lg bg-brand-300 px-6 py-2 text-sm font-medium text-neutral-900 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-400 dark:text-white dark:hover:bg-brand-500"
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
      <div
        role="group"
        aria-label="問題ナビゲーション"
        className="flex flex-wrap gap-2"
      >
        {attempt.questions.map((q, i) => (
          <button
            key={q.attemptQuestionId}
            type="button"
            ref={(element) => {
              questionNavButtonRefs.current[i] = element;
            }}
            onClick={() => {
              setCurrentIndex(i);
              setDraftSelectedChoices([]);
            }}
            onKeyDown={(event) => {
              handleQuestionNavKeyDown(event, i);
            }}
            aria-current={i === currentIndex ? "true" : undefined}
            aria-label={`問題 ${q.order}${isQuestionAnswered(q) ? "（回答済み）" : "（未回答）"}`}
            className={`h-8 w-8 rounded text-xs font-medium transition ${
              i === currentIndex
                ? "bg-brand-300 text-neutral-900 dark:bg-brand-400 dark:text-white"
                : isQuestionAnswered(q)
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
};

const ResultView = ({ attempt }: { attempt: AttemptData }) => {
  const router = useRouter();
  const result = attempt.result;

  if (!result) return null;

  const breakdown = result.categoryBreakdown;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <section className="rounded-2xl border border-black/10 bg-white p-8 dark:border-white/15 dark:bg-black/50">
        <h1 className="mb-2 text-center text-2xl font-semibold">テスト結果</h1>
        <p className="mb-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
          全{attempt.questions.length}問
        </p>

        <div className="mb-8 text-center">
          <span className="text-5xl font-bold text-brand-600 dark:text-brand-300">
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
