"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
    answerIndex?: number;
    explanation?: string;
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

type MeStats = {
  totalAttempts: number;
  averagePercent: number;
  recentAveragePercent: number;
  bestPercent: number;
  streakDays: number;
  totalAnswered: number;
  recent7DaysAnswered: number;
  weeklyActivity: Array<{
    date: string;
    count: number;
  }>;
  activityHeatmap: Array<{
    date: string;
    count: number;
  }>;
  categoryProgress: CategoryScore[];
};

type MeProfile = {
  id: string;
  email: string;
};

type MeTabKey = "summary" | "history";

const ATTEMPTS_PAGE_SIZE = 10;
const NOTION_STATUS_POLL_INTERVAL_MS = 1500;
const NOTION_STATUS_POLL_MAX_ATTEMPTS = 40;

type NotionDeliveryJobSnapshot = {
  id: string;
  totalQuestions: number;
  processedQuestions: number;
  successQuestions: number;
  failedQuestions: number;
  duplicateDetected: boolean;
  lastError: string | null;
};

export const MeDashboard = () => {
  const router = useRouter();
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<MeStats | null>(null);
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [activeTab, setActiveTab] = useState<MeTabKey>("summary");
  const [attemptsPage, setAttemptsPage] = useState(1);
  const [attemptsTotalPages, setAttemptsTotalPages] = useState(0);
  const [attemptsTotalCount, setAttemptsTotalCount] = useState(0);
  const [isAttemptsLoading, setIsAttemptsLoading] = useState(false);
  const [latestCompletedAttempt, setLatestCompletedAttempt] =
    useState<AttemptSummary | null>(null);
  const [latestInProgressAttempt, setLatestInProgressAttempt] =
    useState<AttemptSummary | null>(null);
  const [deliveryStateMap, setDeliveryStateMap] = useState<
    Record<string, NotionDeliveryState>
  >({});
  const [exportStateMap, setExportStateMap] = useState<Record<string, ExportState>>({});
  const errorRef = useRef<HTMLParagraphElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const wait = async (ms: number): Promise<void> => {
    await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  };

  useEffect(() => {
    const fetchDashboardData = async (): Promise<void> => {
      try {
        const [meResponse, statsResponse, attemptsResponse] = await Promise.all([
          fetch("/api/me"),
          fetch("/api/me/stats"),
          fetch(`/api/me/attempts?page=1&pageSize=${ATTEMPTS_PAGE_SIZE}`),
        ]);

        if (!meResponse.ok) {
          setError("ユーザー情報の取得に失敗しました");
          return;
        }
        if (!statsResponse.ok) {
          setError("学習サマリーの取得に失敗しました");
          return;
        }
        if (!attemptsResponse.ok) {
          setError("履歴の取得に失敗しました");
          return;
        }

        const meData = (await meResponse.json()) as MeProfile;
        const statsData = (await statsResponse.json()) as MeStats;
        const attemptsData = (await attemptsResponse.json()) as {
          attempts: AttemptSummary[];
          pagination: {
            totalCount: number;
            totalPages: number;
            currentPage: number;
            pageSize: number;
          };
          summary: {
            latestCompleted: AttemptSummary | null;
            latestInProgress: AttemptSummary | null;
          };
        };
        setProfile(meData);
        setStats(statsData);
        setAttempts(attemptsData.attempts);
        setAttemptsTotalCount(attemptsData.pagination.totalCount);
        setAttemptsTotalPages(attemptsData.pagination.totalPages);
        setAttemptsPage(attemptsData.pagination.currentPage);
        setLatestCompletedAttempt(attemptsData.summary.latestCompleted);
        setLatestInProgressAttempt(attemptsData.summary.latestInProgress);
      } catch {
        setError("通信に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchDashboardData();
  }, []);

  useEffect(() => {
    if (error) {
      errorRef.current?.focus();
    }
  }, [error]);

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

  const handleAttemptsPageChange = async (nextPage: number): Promise<void> => {
    if (nextPage < 1 || (attemptsTotalPages > 0 && nextPage > attemptsTotalPages)) {
      return;
    }

    setIsAttemptsLoading(true);
    setSelectedAttempt(null);
    setError("");
    try {
      const response = await fetch(
        `/api/me/attempts?page=${nextPage}&pageSize=${ATTEMPTS_PAGE_SIZE}`,
      );
      if (!response.ok) {
        setError("履歴の取得に失敗しました");
        return;
      }

      const data = (await response.json()) as {
        attempts: AttemptSummary[];
        pagination: {
          totalCount: number;
          totalPages: number;
          currentPage: number;
          pageSize: number;
        };
        summary: {
          latestCompleted: AttemptSummary | null;
          latestInProgress: AttemptSummary | null;
        };
      };
      setAttempts(data.attempts);
      setAttemptsTotalCount(data.pagination.totalCount);
      setAttemptsTotalPages(data.pagination.totalPages);
      setAttemptsPage(data.pagination.currentPage);
      setLatestCompletedAttempt(data.summary.latestCompleted);
      setLatestInProgressAttempt(data.summary.latestInProgress);
    } catch {
      setError("通信に失敗しました");
    } finally {
      setIsAttemptsLoading(false);
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
        status?: string;
        message?: string;
        reason?: string;
        errorMessage?: string;
        job?: NotionDeliveryJobSnapshot;
      };

      if (!response.ok) {
        setDeliveryStateMap((prev) => ({
          ...prev,
          [attemptId]: {
            isSending: false,
            message:
              data.message ??
              data.errorMessage ??
              data.reason ??
              "Notion送信に失敗しました",
            kind: "error",
          },
        }));
        return;
      }

      // Fallback synchronous mode response (no job polling)
      if (data.status === "completed") {
        const isDuplicate = data.job?.duplicateDetected === true;
        setDeliveryStateMap((prev) => ({
          ...prev,
          [attemptId]: {
            isSending: false,
            message: isDuplicate
              ? "既に送信済みのため新規連携はありません"
              : "Notionに送信しました",
            kind: isDuplicate ? "error" : "success",
          },
        }));
        return;
      }

      const pollDeliveryStatus = async (): Promise<void> => {
        for (let pollCount = 0; pollCount < NOTION_STATUS_POLL_MAX_ATTEMPTS; pollCount += 1) {
          const statusResponse = await fetch(
            `/api/me/attempts/${attemptId}/deliver-notion`,
          );
          if (!statusResponse.ok) {
            setDeliveryStateMap((prev) => ({
              ...prev,
              [attemptId]: {
                isSending: false,
                message: "Notion送信ステータスの取得に失敗しました",
                kind: "error",
              },
            }));
            return;
          }

          const statusData = (await statusResponse.json()) as {
            status?: string;
            message?: string;
            job?: NotionDeliveryJobSnapshot;
          };
          const job = statusData.job;
          const progressText = job
            ? ` (${job.processedQuestions}/${job.totalQuestions})`
            : "";

          if (statusData.status === "queued" || statusData.status === "in_progress") {
            setDeliveryStateMap((prev) => ({
              ...prev,
              [attemptId]: {
                isSending: true,
                message: `Notion送信中...${progressText}`,
                kind: null,
              },
            }));
            await wait(NOTION_STATUS_POLL_INTERVAL_MS);
            continue;
          }

          if (statusData.status === "completed") {
            if (job?.duplicateDetected) {
              setDeliveryStateMap((prev) => ({
                ...prev,
                [attemptId]: {
                  isSending: false,
                  message: "既に送信済みのため新規連携はありません",
                  kind: "error",
                },
              }));
              return;
            }

            setDeliveryStateMap((prev) => ({
              ...prev,
              [attemptId]: {
                isSending: false,
                message: "Notionに送信しました",
                kind: "success",
              },
            }));
            return;
          }

          if (statusData.status === "failed") {
            setDeliveryStateMap((prev) => ({
              ...prev,
              [attemptId]: {
                isSending: false,
                message:
                  statusData.message ??
                  job?.lastError ??
                  (job?.failedQuestions
                    ? `Notion送信に失敗しました（失敗 ${job.failedQuestions} 件）`
                    : "Notion送信に失敗しました"),
                kind: "error",
              },
            }));
            return;
          }

          setDeliveryStateMap((prev) => ({
            ...prev,
            [attemptId]: {
              isSending: false,
              message: "Notion送信状態を確認できませんでした",
              kind: "error",
            },
          }));
          return;
        }

        setDeliveryStateMap((prev) => ({
          ...prev,
          [attemptId]: {
            isSending: false,
            message: "送信処理の完了待ちがタイムアウトしました",
            kind: "error",
          },
        }));
      };

      if (data.status === "queued" || data.status === "in_progress") {
        setDeliveryStateMap((prev) => ({
          ...prev,
          [attemptId]: {
            isSending: true,
            message: "Notion送信ジョブを開始しました",
            kind: null,
          },
        }));
        await pollDeliveryStatus();
        return;
      }

      setDeliveryStateMap((prev) => ({
        ...prev,
        [attemptId]: {
          isSending: false,
          message: data.message ?? data.reason ?? "Notion送信を開始できませんでした",
          kind: "error",
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

  const tabs: Array<{ key: MeTabKey; label: string }> = [
    { key: "summary", label: "学習サマリー" },
    { key: "history", label: "学習履歴" },
  ];

  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ): void => {
    const lastIndex = tabs.length - 1;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      const nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
      const nextTab = tabs[nextIndex];
      if (!nextTab) {
        return;
      }
      setActiveTab(nextTab.key);
      tabRefs.current[nextIndex]?.focus();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const prevIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
      const prevTab = tabs[prevIndex];
      if (!prevTab) {
        return;
      }
      setActiveTab(prevTab.key);
      tabRefs.current[prevIndex]?.focus();
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      const firstTab = tabs[0];
      if (!firstTab) {
        return;
      }
      setActiveTab(firstTab.key);
      tabRefs.current[0]?.focus();
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const lastTab = tabs[lastIndex];
      if (!lastTab) {
        return;
      }
      setActiveTab(lastTab.key);
      tabRefs.current[lastIndex]?.focus();
    }
  };

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">読み込み中...</p>
      </section>
    );
  }

  const latestCompleted = latestCompletedAttempt;
  const inProgressAttempt = latestInProgressAttempt;
  const historyStartIndex =
    attemptsTotalCount === 0 ? 0 : (attemptsPage - 1) * ATTEMPTS_PAGE_SIZE + 1;
  const historyEndIndex = Math.min(
    attemptsPage * ATTEMPTS_PAGE_SIZE,
    attemptsTotalCount,
  );

  const profileInitial =
    profile?.email.trim().charAt(0).toUpperCase() || "?";
  const profileName = profile?.email.split("@")[0] ?? "学習者";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">マイページ</h1>

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

      <section className="w-fit rounded-full border border-black/10 bg-white p-1 dark:border-white/15 dark:bg-black/50">
        <div role="tablist" aria-label="マイページ表示切り替え" className="flex gap-1">
          {tabs.map((tab, index) => (
            <button
              key={tab.key}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`me-tab-${tab.key}`}
              aria-controls={`me-panel-${tab.key}`}
              aria-selected={activeTab === tab.key}
              tabIndex={activeTab === tab.key ? 0 : -1}
              onClick={() => setActiveTab(tab.key)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-brand-300 text-neutral-900 dark:bg-brand-400 dark:text-white"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === "summary" && profile && stats && (
        <div
          id="me-panel-summary"
          role="tabpanel"
          aria-labelledby="me-tab-summary"
          className="space-y-6"
        >
          <section className="grid grid-cols-1 gap-4">
            <article className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-200 text-xl font-semibold text-brand-600 dark:bg-brand-400/25 dark:text-brand-200">
                    {profileInitial}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      {profileName}
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {profile.email}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-brand-200 px-2 py-0.5 text-brand-700 dark:bg-brand-400/25 dark:text-brand-200">
                        {stats.streakDays}日連続
                      </span>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        累計回答 {stats.totalAnswered}問（全期間）
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/select")}
                  className="rounded-lg bg-brand-300 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-brand-400 dark:bg-brand-400 dark:text-white dark:hover:bg-brand-500"
                >
                  学習を始める
                </button>
              </div>
            </article>
            <ActivityHeatmap items={stats.activityHeatmap} />
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="全体平均点" value={`${stats.averagePercent}%`} />
            <SummaryCard label="受験回数" value={`${stats.totalAttempts}回`} />
            <SummaryCard label="直近10回平均点" value={`${stats.recentAveragePercent}%`} />
            <SummaryCard label="直近7日回答数" value={`${stats.recent7DaysAnswered}問`} />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <article className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
              <h2 className="mb-1 text-lg font-semibold">前回の続き</h2>
              <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
                直近の学習状態から再開できます
              </p>
              {inProgressAttempt ? (
                <div className="rounded-xl border border-brand-200 bg-brand-200/40 p-4 dark:border-brand-400/40 dark:bg-brand-400/10">
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    進行中の受験があります
                  </p>
                  <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                    開始: {formatDate(inProgressAttempt.startedAt)}
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push(`/quiz/${inProgressAttempt.id}`)}
                    className="mt-3 rounded-lg bg-brand-300 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-brand-400 dark:bg-brand-400 dark:text-white dark:hover:bg-brand-500"
                  >
                    続きから始める
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/30">
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">
                    現在進行中の受験はありません。新しいテストを開始しましょう。
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/select")}
                    className="mt-3 rounded-lg bg-brand-300 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-brand-400 dark:bg-brand-400 dark:text-white dark:hover:bg-brand-500"
                  >
                    新しいテストを始める
                  </button>
                </div>
              )}
            </article>

            {latestCompleted && latestCompleted.result ? (
              <article className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
                <h2 className="mb-1 text-lg font-semibold">直近の結果</h2>
                <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
                  {formatDate(latestCompleted.completedAt)}
                </p>
                <div className="mb-4 flex items-end gap-2">
                  <span className="text-4xl font-bold text-brand-500 dark:text-brand-300">
                    {latestCompleted.result.overallPercent}
                  </span>
                  <span className="pb-1 text-xl text-neutral-500">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("history");
                    void handleSelectAttempt(latestCompleted.id);
                  }}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-200 dark:hover:border-neutral-500"
                >
                  履歴で詳細を確認
                </button>
              </article>
            ) : (
              <article className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
                <h2 className="mb-1 text-lg font-semibold">直近の結果</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  まだ採点済みの受験がありません。
                </p>
              </article>
            )}
          </section>
        </div>
      )}

      {/* 履歴一覧 */}
      {activeTab === "history" && (
      <div id="me-panel-history" role="tabpanel" aria-labelledby="me-tab-history" className="space-y-6">
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
              className="rounded-lg bg-brand-300 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-brand-400 dark:bg-brand-400 dark:text-white dark:hover:bg-brand-500"
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
                      ? "border-brand-400 bg-brand-200/40 dark:border-brand-300 dark:bg-brand-400/10"
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
                      <span className="text-sm font-semibold text-brand-600 dark:text-brand-300">
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
                      {attempt.status === "IN_PROGRESS" && (
                        <button
                          type="button"
                          onClick={() => router.push(`/quiz/${attempt.id}`)}
                          aria-label={`進行中の受験 ${attempt.id} を再開`}
                          className="rounded-lg bg-brand-300 px-3 py-1.5 text-xs font-medium text-neutral-900 transition hover:bg-brand-400 dark:bg-brand-400 dark:text-white dark:hover:bg-brand-500"
                        >
                          再開
                        </button>
                      )}
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
                              : deliveryState.kind === "error"
                                ? "text-red-600 dark:text-red-400"
                                : "text-neutral-600 dark:text-neutral-400"
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
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700">
              <p className="text-neutral-600 dark:text-neutral-400">
                {historyStartIndex}-{historyEndIndex} / {attemptsTotalCount} 件
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleAttemptsPageChange(attemptsPage - 1);
                  }}
                  disabled={attemptsPage <= 1 || isAttemptsLoading}
                  className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:hover:border-neutral-500"
                >
                  前へ
                </button>
                <span className="text-xs text-neutral-600 dark:text-neutral-400">
                  {attemptsTotalPages === 0 ? "1 / 1" : `${attemptsPage} / ${attemptsTotalPages}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void handleAttemptsPageChange(attemptsPage + 1);
                  }}
                  disabled={
                    attemptsTotalPages === 0 ||
                    attemptsPage >= attemptsTotalPages ||
                    isAttemptsLoading
                  }
                  className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:hover:border-neutral-500"
                >
                  次へ
                </button>
              </div>
            </div>
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
          className="rounded-lg bg-brand-300 px-6 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-brand-400 dark:bg-brand-400 dark:text-white dark:hover:bg-brand-500"
        >
          新しいテストを受ける
        </button>
      )}
      </div>
      )}
    </div>
  );
};

const ActivityHeatmap = ({
  items,
}: {
  items: Array<{ date: string; count: number }>;
}) => {
  const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);
  const activityByDate = new Map(items.map((item) => [item.date, item.count]));
  const totalContributions = items.reduce((sum, item) => sum + item.count, 0);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const oneYearAgo = new Date(today);
  oneYearAgo.setUTCDate(today.getUTCDate() - 364);
  const firstGridDate = new Date(oneYearAgo);
  const mondayOffset = (firstGridDate.getUTCDay() + 6) % 7;
  firstGridDate.setUTCDate(firstGridDate.getUTCDate() - mondayOffset);

  const columns: Array<
    Array<{ date: string; count: number; isInRange: boolean }>
  > = [];
  const cursor = new Date(firstGridDate);
  while (cursor <= today) {
    const week: Array<{ date: string; count: number; isInRange: boolean }> = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const key = toDateKey(cursor);
      const isInRange = cursor >= oneYearAgo && cursor <= today;
      week.push({
        date: key,
        count: isInRange ? (activityByDate.get(key) ?? 0) : 0,
        isInRange,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    columns.push(week);
  }

  const weekCount = columns.length;
  const heatmapCellSize = 10;
  const heatmapGapSize = 2;
  const heatmapGridTemplate = `repeat(${weekCount}, ${heatmapCellSize}px)`;
  const maxCount = Math.max(
    ...columns.flatMap((week) =>
      week.filter((day) => day.isInRange).map((day) => day.count),
    ),
    1,
  );

  const monthLabels = columns.map((week, weekIndex) => {
    const firstInRangeDay = week.find((day) => day.isInRange);
    if (!firstInRangeDay) {
      return "";
    }
    const date = new Date(firstInRangeDay.date);
    const month = date.getUTCMonth();
    const prevFirstDay = columns[weekIndex - 1]?.find((day) => day.isInRange);
    const prevMonth =
      prevFirstDay === undefined
        ? -1
        : new Date(prevFirstDay.date).getUTCMonth();
    return month !== prevMonth
      ? date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })
      : "";
  });
  const weekdayLabels: string[] = ["Mon", "", "Wed", "", "Fri", "", ""];

  return (
    <article className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
      <h2 className="mb-1 text-lg font-semibold">学習アクティビティ</h2>
      <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
        {totalContributions.toLocaleString("en-US")} contributions in the last year
      </p>
      <div className="overflow-x-auto pb-1">
        <div className="min-w-max rounded-lg border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-neutral-900/40">
          <div className="flex flex-col gap-2">
            <div
              className="ml-7 grid"
              style={{
                gridTemplateColumns: heatmapGridTemplate,
                columnGap: `${heatmapGapSize}px`,
              }}
            >
              {monthLabels.map((label, index) => (
                <span
                  key={`${label}-${index}`}
                  className="text-[10px] leading-none text-neutral-500 dark:text-neutral-400"
                >
                  {label}
                </span>
              ))}
            </div>
            <div className="flex gap-1.5">
              <div className="grid grid-rows-7 items-center text-[10px] text-neutral-500 dark:text-neutral-400">
                {weekdayLabels.map((label, index) => (
                  <span key={`${label}-${index}`} className="h-2.5 leading-none">
                    {label}
                  </span>
                ))}
              </div>
              <div className="inline-flex gap-0.5">
                {columns.map((week, columnIndex) => (
                  <div key={columnIndex} className="grid grid-rows-7 gap-0.5">
                    {week.map((item) => {
                      if (!item.isInRange) {
                        return (
                          <div
                            key={item.date}
                            className="h-2.5 w-2.5 rounded-[2px] bg-transparent"
                            aria-hidden="true"
                          />
                        );
                      }

                      const level = getHeatLevel(item.count, maxCount);
                      return (
                        <div
                          key={item.date}
                          title={`${item.date}: ${item.count}問`}
                          aria-label={`${item.date}に${item.count}問回答`}
                          className={`h-2.5 w-2.5 rounded-[2px] ${level}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <span>Less</span>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-neutral-200 dark:bg-neutral-700" />
          <span className="h-3 w-3 rounded-sm bg-brand-200 dark:bg-brand-400/35" />
          <span className="h-3 w-3 rounded-sm bg-brand-300 dark:bg-brand-400/60" />
          <span className="h-3 w-3 rounded-sm bg-brand-500 dark:bg-brand-300" />
        </div>
        <span>More</span>
      </div>
    </article>
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
          <span className="ml-2 text-brand-600 dark:text-brand-300">
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
          <p className="text-sm text-green-600 dark:text-green-400">
            全問正解です！
          </p>
        </div>
      )}
    </section>
  );
};

const SummaryCard = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => {
  return (
    <article className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-black/50">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        {value}
      </p>
    </article>
  );
};

const getHeatLevel = (count: number, maxCount: number): string => {
  if (count === 0) {
    return "bg-neutral-200 dark:bg-neutral-700";
  }
  if (count <= maxCount * 0.33) {
    return "bg-brand-200 dark:bg-brand-400/35";
  }
  if (count <= maxCount * 0.66) {
    return "bg-brand-300 dark:bg-brand-400/60";
  }
  return "bg-brand-500 dark:bg-brand-300";
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
