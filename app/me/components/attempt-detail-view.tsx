import { getAnswerIndices, getUserSelectedIndices } from "@/lib/quiz/helpers";
import type { CategoryScore } from "@/lib/quiz/types";

import type { AttemptDetail } from "../types";

type Props = {
  attempt: AttemptDetail;
};

export const AttemptDetailView = ({ attempt }: Props) => {
  const incorrectQuestions = attempt.questions.filter((q) => q.isCorrect === false);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">
        テスト詳細
        {attempt.result && (
          <span className="ml-2 text-brand-600 dark:text-brand-300">
            {attempt.result.overallPercent}%
          </span>
        )}
      </h2>

      {attempt.result && (
        <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
          <h3 className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            カテゴリ別正答率
          </h3>
          <div className="space-y-2">
            {attempt.result.categoryBreakdown.map((cat: CategoryScore) => (
              <div key={cat.category} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-sm text-neutral-600 dark:text-neutral-400">
                  {cat.category}
                </span>
                <div className="flex-1">
                  <progress
                    value={cat.percent}
                    max={100}
                    aria-label={`${cat.category} 正答率`}
                    className="h-2.5 w-full overflow-hidden rounded-full [appearance:none] [&::-webkit-progress-bar]:bg-neutral-200 [&::-webkit-progress-value]:bg-brand-400 [&::-webkit-progress-value]:transition-all dark:[&::-webkit-progress-bar]:bg-neutral-700 dark:[&::-webkit-progress-value]:bg-brand-300"
                  />
                </div>
                <span className="w-20 text-right text-sm font-medium">
                  {cat.correct}/{cat.total} ({cat.percent}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {incorrectQuestions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            間違えた問題 ({incorrectQuestions.length}件)
          </h3>
          {incorrectQuestions.map((q) => (
            <div
              key={q.attemptQuestionId}
              className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-black/50"
            >
              <div className="mb-2 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="rounded bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
                  Q{q.order}
                </span>
                <span className="rounded bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
                  {q.question.category}
                </span>
                <span className="rounded bg-red-100 px-2 py-0.5 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  不正解
                </span>
              </div>

              <p className="mb-3 text-sm leading-relaxed">{q.question.questionText}</p>

              <div className="mb-3 flex flex-col gap-1.5">
                {(() => {
                  const answerSet = new Set(getAnswerIndices(q.question));
                  const userChoiceSet = new Set(getUserSelectedIndices(q));
                  return q.question.choices.map((choice, i) => {
                  const isAnswer = answerSet.has(i);
                  const isUserChoice = userChoiceSet.has(i);

                  return (
                    <div
                      key={i}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        isAnswer
                          ? "border border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                          : isUserChoice
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
                          正解
                        </span>
                      )}
                      {isUserChoice && !isAnswer && (
                        <span className="ml-2 text-xs text-red-600 dark:text-red-400">
                          あなたの回答
                        </span>
                      )}
                    </div>
                  );
                  });
                })()}
              </div>

              {q.question.explanation && (
                <div className="rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-400">
                  <span className="font-medium">解説: </span>
                  {q.question.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {incorrectQuestions.length === 0 && attempt.status === "COMPLETED" && (
        <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
          <p className="text-sm text-green-600 dark:text-green-400">全問正解です！</p>
        </div>
      )}
    </section>
  );
};
