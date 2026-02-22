"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CategoryScore = {
  category: string;
  total: number;
  correct: number;
  percent: number;
};

type AttemptFilters = {
  categories?: string[];
  level?: number;
  count?: number;
};

type AttemptSummary = {
  id: string;
  status: "IN_PROGRESS" | "COMPLETED";
  filters: AttemptFilters;
  startedAt: string;
  completedAt: string | null;
  result: {
    overallPercent: number;
    categoryBreakdown: CategoryScore[];
  } | null;
};

type QuestionDetail = {
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
    answerIndex: number;
    explanation: string;
  };
};

type AttemptDetail = AttemptSummary & {
  questions: QuestionDetail[];
};

type NotionDeliveryState = {
  isSending: boolean;
  message: string;
  kind: "success" | "error" | null;
};

type ExportState = {
  isExporting: boolean;
  message: string;
  kind: "success" | "error" | null;
};

export const MeDashboard = () => {
  const router = useRouter();
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [deliveryStateMap, setDeliveryStateMap] = useState<
    Record<string, NotionDeliveryState>
  >({});
  const [exportStateMap, setExportStateMap] = useState<Record<string, ExportState>>({});

  useEffect(() => {
    const fetchAttempts = async (): Promise<void> => {
      try {
        const response = await fetch("/api/me/attempts");

        if (!response.ok) {
          setError("履歴の取得に失敗しました");
          return;
        }

        const data = (await response.json()) as { attempts: AttemptSummary[] };
        setAttempts(data.attempts);
      } catch {
        setError("通信に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchAttempts();
  }, []);

  const handleSelectAttempt = async (attemptId: string): Promise<void> => {
    setIsDetailLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/me/attempts/${attemptId}`);

      if (!response.ok) {
        setError("詳細の取得に失敗しました");
        return;
      }

      const data = (await response.json()) as AttemptDetail;
      setSelectedAttempt(data);
    } catch {
      setError("通信に失敗しました");
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleDeliverToNotion = async (attemptId: string): Promise<void> => {
    setDeliveryStateMap((prev) => ({
      ...prev,
      [attemptId]: {
        isSending: true,
        message: "",
        kind: null,
      },
    }));

    try {
      const response = await fetch(`/api/me/attempts/${attemptId}/deliver-notion`, {
        method: "POST",
      });

      const data = (await response.json()) as {
        status?: "sent" | "skipped" | "failed";
        duplicate?: boolean;
        reason?: string;
        errorMessage?: string;
      };

      if (!response.ok) {
        setDeliveryStateMap((prev) => ({
          ...prev,
          [attemptId]: {
            isSending: false,
            message: data.errorMessage ?? data.reason ?? "Notion送信に失敗しました",
            kind: "error",
          },
        }));
        return;
      }

      const successMessage =
        data.status === "sent" && data.duplicate
          ? "既に送信済みのため重複送信をスキップしました"
          : "Notionに送信しました";

      setDeliveryStateMap((prev) => ({
        ...prev,
        [attemptId]: {
          isSending: false,
          message: successMessage,
          kind: "success",
        },
      }));
    } catch {
      setDeliveryStateMap((prev) => ({
        ...prev,
        [attemptId]: {
          isSending: false,
          message: "通信に失敗しました",
          kind: "error",
        },
      }));
    }
  };

  const handleExportAttempt = async (
    attemptId: string,
    format: "csv" | "json",
  ): Promise<void> => {
    setExportStateMap((prev) => ({
      ...prev,
      [attemptId]: {
        isExporting: true,
        message: "",
        kind: null,
      },
    }));

    try {
      const response = await fetch(
        `/api/me/attempts/${attemptId}/export?format=${format}`,
      );

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setExportStateMap((prev) => ({
          ...prev,
          [attemptId]: {
            isExporting: false,
            message: data.message ?? "エクスポートに失敗しました",
            kind: "error",
          },
        }));
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const extension = format === "csv" ? "csv" : "json";
      link.href = objectUrl;
      link.download = `attempt-${attemptId}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);

      setExportStateMap((prev) => ({
        ...prev,
        [attemptId]: {
          isExporting: false,
          message: `${format.toUpperCase()}をダウンロードしました`,
          kind: "success",
        },
      }));
    } catch {
      setExportStateMap((prev) => ({
        ...prev,
        [attemptId]: {
          isExporting: false,
          message: "通信に失敗しました",
          kind: "error",
        },
      }));
    }
  };

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">読み込み中...</p>
      </section>
    );
  }

  const completedAttempts = attempts.filter((a) => a.status === "COMPLETED" && a.result);
  const latestCompleted = completedAttempts[0];

  const weakCategories = latestCompleted
    ? (latestCompleted.result!.categoryBreakdown as CategoryScore[])
        .slice()
        .sort((a, b) => a.percent - b.percent)
    : [];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">マイページ</h1>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 直近スコアサマリ */}
      {latestCompleted && latestCompleted.result && (
        <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
          <h2 className="mb-4 text-lg font-semibold">直近テスト結果</h2>
          <div className="mb-4 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
              {latestCompleted.result.overallPercent}
            </span>
            <span className="text-xl text-neutral-500">%</span>
            <span className="ml-2 text-sm text-neutral-500 dark:text-neutral-400">
              {formatDate(latestCompleted.completedAt)}
            </span>
          </div>

          {/* カテゴリ別 */}
          <div className="space-y-2">
            {(latestCompleted.result.categoryBreakdown as CategoryScore[]).map((cat) => (
              <div key={cat.category} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-sm text-neutral-600 dark:text-neutral-400">
                  {cat.category}
                </span>
                <div className="flex-1">
                  <div className="h-2.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${cat.percent}%` }}
                    />
                  </div>
                </div>
                <span className="w-16 text-right text-sm font-medium">
                  {cat.percent}%
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 弱点カテゴリ */}
      {weakCategories.length > 0 && (
        <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
          <h2 className="mb-3 text-lg font-semibold">弱点カテゴリ</h2>
          <div className="flex flex-wrap gap-2">
            {weakCategories.slice(0, 3).map((cat) => (
              <span
                key={cat.category}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  cat.percent < 50
                    ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                    : cat.percent < 70
                      ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                      : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                }`}
              >
                {cat.category}: {cat.percent}%
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 履歴一覧 */}
      <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
        <h2 className="mb-4 text-lg font-semibold">受験履歴</h2>

        {attempts.length === 0 ? (
          <div className="text-center">
            <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
              まだ受験履歴がありません
            </p>
            <button
              type="button"
              onClick={() => router.push("/select")}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              テストを受ける
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {attempts.map((attempt) => {
              const filters = attempt.filters as AttemptFilters;
              const deliveryState = deliveryStateMap[attempt.id];
              const exportState = exportStateMap[attempt.id];
              const canDeliver = attempt.status === "COMPLETED";
              const canExport = attempt.status === "COMPLETED";
              const isExporting = exportState?.isExporting === true;

              return (
                <div
                  key={attempt.id}
                  className={`w-full rounded-lg border px-4 py-3 text-left ${
                    selectedAttempt?.id === attempt.id
                      ? "border-blue-500 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-900/10"
                      : "border-neutral-200 dark:border-neutral-700"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectAttempt(attempt.id)}
                    className="w-full text-left transition hover:text-inherit"
                  >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          attempt.status === "COMPLETED"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}
                      >
                        {attempt.status === "COMPLETED" ? "完了" : "進行中"}
                      </span>
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {formatDate(attempt.startedAt)}
                      </span>
                    </div>
                    {attempt.result && (
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {attempt.result.overallPercent}%
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {filters.categories?.map((cat) => (
                      <span
                        key={cat}
                        className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800"
                      >
                        {cat}
                      </span>
                    ))}
                    {filters.level && (
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">
                        Lv.{filters.level}
                      </span>
                    )}
                  </div>
                  </button>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          void handleExportAttempt(attempt.id, "json");
                        }}
                        disabled={!canExport || isExporting}
                        aria-label={`受験 ${attempt.id} の結果をJSONでエクスポート`}
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:hover:border-neutral-500"
                      >
                        {isExporting ? "出力中..." : "JSON出力"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void handleExportAttempt(attempt.id, "csv");
                        }}
                        disabled={!canExport || isExporting}
                        aria-label={`受験 ${attempt.id} の結果をCSVでエクスポート`}
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:hover:border-neutral-500"
                      >
                        {isExporting ? "出力中..." : "CSV出力"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void handleDeliverToNotion(attempt.id);
                        }}
                        disabled={!canDeliver || deliveryState?.isSending === true}
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:hover:border-neutral-500"
                      >
                        {deliveryState?.isSending === true
                          ? "送信中..."
                          : "Notionへ送信"}
                      </button>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {exportState?.message && (
                        <span
                          className={`text-xs ${
                            exportState.kind === "success"
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {exportState.message}
                        </span>
                      )}
                      {deliveryState?.message && (
                        <span
                          className={`text-xs ${
                            deliveryState.kind === "success"
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {deliveryState.message}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 詳細表示 */}
      {isDetailLoading && (
        <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">読み込み中...</p>
        </section>
      )}

      {selectedAttempt && !isDetailLoading && (
        <AttemptDetailView attempt={selectedAttempt} />
      )}

      {/* テストを受けるボタン */}
      {attempts.length > 0 && (
        <button
          type="button"
          onClick={() => router.push("/select")}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          新しいテストを受ける
        </button>
      )}
    </div>
  );
};

const AttemptDetailView = ({ attempt }: { attempt: AttemptDetail }) => {
  const incorrectQuestions = attempt.questions.filter(
    (q) => q.isCorrect === false,
  );

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">
        テスト詳細
        {attempt.result && (
          <span className="ml-2 text-blue-600 dark:text-blue-400">
            {attempt.result.overallPercent}%
          </span>
        )}
      </h2>

      {/* カテゴリ別スコア */}
      {attempt.result && (
        <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
          <h3 className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            カテゴリ別正答率
          </h3>
          <div className="space-y-2">
            {(attempt.result.categoryBreakdown as CategoryScore[]).map((cat) => (
              <div key={cat.category} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-sm text-neutral-600 dark:text-neutral-400">
                  {cat.category}
                </span>
                <div className="flex-1">
                  <div className="h-2.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
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
        </div>
      )}

      {/* 間違い問題一覧 */}
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
                {(q.question.choices as string[]).map((choice, i) => {
                  const isAnswer = i === q.question.answerIndex;
                  const isUserChoice = i === q.selectedIndex;

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
                })}
              </div>

              <div className="rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-400">
                <span className="font-medium">解説: </span>
                {q.question.explanation}
              </div>
            </div>
          ))}
        </div>
      )}

      {incorrectQuestions.length === 0 && attempt.status === "COMPLETED" && (
        <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
          <p className="text-sm text-green-600 dark:text-green-400">
            全問正解です！
          </p>
        </div>
      )}
    </section>
  );
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return "";

  const date = new Date(dateString);

  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};
