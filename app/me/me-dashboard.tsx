"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ActivityHeatmap } from "./components/activity-heatmap";
import { HistoryTab } from "./components/history-tab";
import { SummaryCard } from "./components/summary-card";
import { useExport } from "./hooks/use-export";
import { useNotionDelivery } from "./hooks/use-notion-delivery";
import type {
  AttemptDetail,
  AttemptSummary,
  MeProfile,
  MeStats,
  MeTabKey,
} from "./types";
import { formatDate } from "./utils";

const ATTEMPTS_PAGE_SIZE = 10;

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
  const [cancelingAttemptId, setCancelingAttemptId] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const { deliveryStateMap, handleDeliverToNotion } = useNotionDelivery();
  const { exportStateMap, handleExportAttempt } = useExport();

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

  const handleCancelAttempt = async (attemptId: string): Promise<void> => {
    setCancelingAttemptId(attemptId);
    setError("");

    try {
      const response = await fetch(`/api/attempts/${attemptId}/cancel`, {
        method: "POST",
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(data.message ?? "受験の中止に失敗しました");
        return;
      }

      if (selectedAttempt?.id === attemptId) {
        setSelectedAttempt(null);
      }

      await handleAttemptsPageChange(attemptsPage);
    } catch {
      setError("通信に失敗しました");
    } finally {
      setCancelingAttemptId(null);
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
      if (!nextTab) return;
      setActiveTab(nextTab.key);
      tabRefs.current[nextIndex]?.focus();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const prevIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
      const prevTab = tabs[prevIndex];
      if (!prevTab) return;
      setActiveTab(prevTab.key);
      tabRefs.current[prevIndex]?.focus();
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      const firstTab = tabs[0];
      if (!firstTab) return;
      setActiveTab(firstTab.key);
      tabRefs.current[0]?.focus();
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const lastTab = tabs[lastIndex];
      if (!lastTab) return;
      setActiveTab(lastTab.key);
      tabRefs.current[lastIndex]?.focus();
    }
  };

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
        <p role="status" aria-live="polite" className="text-sm text-neutral-600 dark:text-neutral-300">
          読み込み中...
        </p>
      </section>
    );
  }

  const latestCompleted = latestCompletedAttempt;
  const inProgressAttempt = latestInProgressAttempt;

  const profileInitial =
    profile?.email.trim().charAt(0).toUpperCase() || "?";
  const profileName = profile?.email.split("@")[0] ?? "学習者";
  const summaryCards = [
    { label: "全体平均点", value: `${stats?.averagePercent ?? 0}%` },
    { label: "受験回数", value: `${stats?.totalAttempts ?? 0}回` },
    { label: "直近10回平均点", value: `${stats?.recentAveragePercent ?? 0}%` },
    { label: "直近7日回答数", value: `${stats?.recent7DaysAnswered ?? 0}問` },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">マイページ</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          学習状況の確認と、履歴の再開・詳細確認ができます。
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

      <section className="w-fit rounded-full border border-black/10 bg-white p-1.5 shadow-sm dark:border-white/15 dark:bg-black/50">
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
          className="space-y-8"
        >
          <section className="space-y-5">
            <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/15 dark:bg-black/50">
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
            <div>
              <ActivityHeatmap items={stats.activityHeatmap} />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">学習サマリー</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {summaryCards.map((card) => (
                <SummaryCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                />
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/15 dark:bg-black/50">
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
              <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/15 dark:bg-black/50">
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
              <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/15 dark:bg-black/50">
                <h2 className="mb-1 text-lg font-semibold">直近の結果</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  まだ採点済みの受験がありません。
                </p>
              </article>
            )}
          </section>
        </div>
      )}

      {activeTab === "history" && (
        <HistoryTab
          attempts={attempts}
          selectedAttempt={selectedAttempt}
          isDetailLoading={isDetailLoading}
          attemptsPage={attemptsPage}
          attemptsTotalPages={attemptsTotalPages}
          attemptsTotalCount={attemptsTotalCount}
          isAttemptsLoading={isAttemptsLoading}
          cancelingAttemptId={cancelingAttemptId}
          deliveryStateMap={deliveryStateMap}
          exportStateMap={exportStateMap}
          onSelectAttempt={handleSelectAttempt}
          onPageChange={handleAttemptsPageChange}
          onCancelAttempt={handleCancelAttempt}
          onDeliverToNotion={handleDeliverToNotion}
          onExport={handleExportAttempt}
        />
      )}
    </div>
  );
};
