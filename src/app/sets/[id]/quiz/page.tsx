"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import Link from "next/link";
import { mockQuizSets } from "@/lib/mock-data";
import { ProgressBar } from "@/components/ProgressBar";
import { ChoiceGroup } from "@/components/ChoiceGroup";
import { StickyNav } from "@/components/StickyNav";

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const setId = params.id as string;

  const set = useMemo(
    () => mockQuizSets.find((s) => s.id === setId),
    [setId]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

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
  const currentQuestion = questions[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalQuestions - 1;

  // Check if all questions are answered
  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  const handleSelect = (choiceId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: choiceId,
    }));
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (!isLast) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSubmit = () => {
    // Navigate to result page with answers in query params
    const answersParam = encodeURIComponent(JSON.stringify(answers));
    router.push(`/sets/${setId}/result?answers=${answersParam}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-24 dark:from-slate-900 dark:to-slate-800 sm:pb-0">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-6">
          <Link
            href={`/sets/${setId}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            中止する
          </Link>
          <h1 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            {set.title}
          </h1>
        </header>

        {/* Progress */}
        <div className="mb-8">
          <ProgressBar current={currentIndex + 1} total={totalQuestions} />
        </div>

        {/* Question */}
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
          <h2 className="mb-6 text-lg font-semibold text-slate-900 dark:text-white sm:text-xl">
            {currentQuestion.text}
          </h2>

          <ChoiceGroup
            choices={currentQuestion.choices}
            selectedId={answers[currentQuestion.id] ?? null}
            onSelect={handleSelect}
          />
        </article>

        {/* Navigation (Desktop) */}
        <div className="hidden sm:block">
          <StickyNav
            onPrev={handlePrev}
            onNext={handleNext}
            onSubmit={handleSubmit}
            isFirst={isFirst}
            isLast={isLast}
            canSubmit={allAnswered}
          />
        </div>
      </div>

      {/* Navigation (Mobile - Sticky) */}
      <div className="sm:hidden">
        <StickyNav
          onPrev={handlePrev}
          onNext={handleNext}
          onSubmit={handleSubmit}
          isFirst={isFirst}
          isLast={isLast}
          canSubmit={allAnswered}
        />
      </div>
    </div>
  );
}
