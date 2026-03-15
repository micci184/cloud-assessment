"use client";

import { useRouter } from "next/navigation";

import type {
  AttemptDetail,
  AttemptFilters,
  AttemptSummary,
  ExportState,
  NotionDeliveryState,
} from "../types";

import { AttemptDetailView } from "./attempt-detail-view";

type Props = {
  attempts: AttemptSummary[];
  selectedAttempt: AttemptDetail | null;
  isDetailLoading: boolean;
  attemptsPage: number;
  attemptsTotalPages: number;
  attemptsTotalCount: number;
  isAttemptsLoading: boolean;
  cancelingAttemptId: string | null;
  deliveryStateMap: Record<string, NotionDeliveryState>;
  exportStateMap: Record<string, ExportState>;
  onSelectAttempt: (attemptId: string) => Promise<void>;
  onPageChange: (page: number) => Promise<void>;
  onCancelAttempt: (attemptId: string) => Promise<void>;
  onDeliverToNotion: (attemptId: string) => Promise<void>;
  onExport: (attemptId: string, format: "csv" | "json") => Promise<void>;
};

const ATTEMPTS_PAGE_SIZE = 10;

export const HistoryTab = ({
  attempts,
  selectedAttempt,
  isDetailLoading,
  attemptsPage,
  attemptsTotalPages,
  attemptsTotalCount,
  isAttemptsLoading,
  cancelingAttemptId,
  deliveryStateMap,
  exportStateMap,
  onSelectAttempt,
  onPageChange,
  onCancelAttempt,
  onDeliverToNotion,
  onExport,
}: Props) => {
  const router = useRouter();

  const historyStartIndex =
    attemptsTotalCount === 0
      ? 0
      : (attemptsPage - 1) * ATTEMPTS_PAGE_SIZE + 1;
  const historyEndIndex = Math.min(
    attemptsPage * ATTEMPTS_PAGE_SIZE,
    attemptsTotalCount,
  );

  return (
    <div
      id="me-panel-history"
      role="tabpanel"
      aria-labelledby="me-tab-history"
      className="space-y-6"
    >
      <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/15 dark:bg-black/50">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">受験履歴</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            過去の受験結果の確認、エクスポート、Notion連携ができます。
          </p>
        </div>

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
          <div className="space-y-3">
            {attempts.map((attempt) => {
              const filters = attempt.filters as AttemptFilters;
              const deliveryState = deliveryStateMap[attempt.id];
              const exportState = exportStateMap[attempt.id];
              const canDeliver = attempt.status === "COMPLETED";
              const canExport = attempt.status === "COMPLETED";
              const isExporting = exportState?.isExporting === true;
              const isCanceling = cancelingAttemptId === attempt.id;

              return (
                <AttemptListItem
                  key={attempt.id}
                  attempt={attempt}
                  filters={filters}
                  isSelected={selectedAttempt?.id === attempt.id}
                  isCanceling={isCanceling}
                  canDeliver={canDeliver}
                  canExport={canExport}
                  isExporting={isExporting}
                  deliveryState={deliveryState}
                  exportState={exportState}
                  onSelect={() => onSelectAttempt(attempt.id)}
                  onResume={() => router.push(`/quiz/${attempt.id}`)}
                  onCancel={() => {
                    void onCancelAttempt(attempt.id);
                  }}
                  onExportJson={() => {
                    void onExport(attempt.id, "json");
                  }}
                  onExportCsv={() => {
                    void onExport(attempt.id, "csv");
                  }}
                  onDeliverNotion={() => {
                    void onDeliverToNotion(attempt.id);
                  }}
                />
              );
            })}
            <Pagination
              startIndex={historyStartIndex}
              endIndex={historyEndIndex}
              totalCount={attemptsTotalCount}
              currentPage={attemptsPage}
              totalPages={attemptsTotalPages}
              isLoading={isAttemptsLoading}
              onPageChange={onPageChange}
            />
          </div>
        )}
      </section>

      {isDetailLoading && (
        <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-neutral-600 dark:text-neutral-300"
          >
            読み込み中...
          </p>
        </section>
      )}

      {selectedAttempt && !isDetailLoading && (
        <AttemptDetailView attempt={selectedAttempt} />
      )}

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
  );
};

type AttemptListItemProps = {
  attempt: AttemptSummary;
  filters: AttemptFilters;
  isSelected: boolean;
  isCanceling: boolean;
  canDeliver: boolean;
  canExport: boolean;
  isExporting: boolean;
  deliveryState: NotionDeliveryState | undefined;
  exportState: ExportState | undefined;
  onSelect: () => void;
  onResume: () => void;
  onCancel: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  onDeliverNotion: () => void;
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

const AttemptListItem = ({
  attempt,
  filters,
  isSelected,
  isCanceling,
  canDeliver,
  canExport,
  isExporting,
  deliveryState,
  exportState,
  onSelect,
  onResume,
  onCancel,
  onExportJson,
  onExportCsv,
  onDeliverNotion,
}: AttemptListItemProps) => (
  <div
    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
      isSelected
        ? "border-brand-400 bg-brand-200/40 dark:border-brand-300 dark:bg-brand-400/10"
        : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:hover:border-neutral-600 dark:hover:bg-neutral-900/20"
    }`}
  >
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left transition hover:text-inherit"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${
              attempt.status === "COMPLETED"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : attempt.status === "CANCELLED"
                  ? "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300"
                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
            }`}
          >
            {attempt.status === "COMPLETED"
              ? "完了"
              : attempt.status === "CANCELLED"
                ? "中止"
                : "進行中"}
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
        {filters.preset === "cloud-practitioner" && (
          <span className="rounded bg-brand-100 px-1.5 py-0.5 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            CLF-C02
          </span>
        )}
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
        {filters.levels && filters.levels.length > 0 && (
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">
            Lv.{filters.levels.join("/")}
          </span>
        )}
      </div>
    </button>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50/80 p-1.5 dark:border-neutral-700 dark:bg-neutral-900/30">
        {attempt.status === "IN_PROGRESS" && (
          <button
            type="button"
            onClick={onResume}
            aria-label={`進行中の受験 ${attempt.id} を再開`}
            className="rounded-lg bg-brand-300 px-3 py-1.5 text-xs font-medium text-neutral-900 transition hover:bg-brand-400 dark:bg-brand-400 dark:text-white dark:hover:bg-brand-500"
          >
            再開
          </button>
        )}
        {attempt.status === "IN_PROGRESS" && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isCanceling}
            aria-label={`進行中の受験 ${attempt.id} を中止`}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:hover:border-neutral-500"
          >
            {isCanceling ? "中止中..." : "中止"}
          </button>
        )}
        <button
          type="button"
          onClick={onExportJson}
          disabled={!canExport || isExporting}
          aria-label={`受験 ${attempt.id} の結果をJSONでエクスポート`}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:hover:border-neutral-500"
        >
          {isExporting ? "出力中..." : "JSON出力"}
        </button>
        <button
          type="button"
          onClick={onExportCsv}
          disabled={!canExport || isExporting}
          aria-label={`受験 ${attempt.id} の結果をCSVでエクスポート`}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:hover:border-neutral-500"
        >
          {isExporting ? "出力中..." : "CSV出力"}
        </button>
        <button
          type="button"
          onClick={onDeliverNotion}
          disabled={!canDeliver || deliveryState?.isSending === true}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:hover:border-neutral-500"
        >
          {deliveryState?.isSending === true ? "送信中..." : "Notionへ送信"}
        </button>
      </div>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="flex flex-col items-end gap-1"
      >
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

type PaginationProps = {
  startIndex: number;
  endIndex: number;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  onPageChange: (page: number) => Promise<void>;
};

const Pagination = ({
  startIndex,
  endIndex,
  totalCount,
  currentPage,
  totalPages,
  isLoading,
  onPageChange,
}: PaginationProps) => (
  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700">
    <p className="text-neutral-600 dark:text-neutral-400">
      {startIndex}-{endIndex} / {totalCount} 件
    </p>
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          void onPageChange(currentPage - 1);
        }}
        disabled={currentPage <= 1 || isLoading}
        className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:hover:border-neutral-500"
      >
        前へ
      </button>
      <span className="text-xs text-neutral-600 dark:text-neutral-400">
        {totalPages === 0
          ? "1 / 1"
          : `${currentPage} / ${totalPages}`}
      </span>
      <button
        type="button"
        onClick={() => {
          void onPageChange(currentPage + 1);
        }}
        disabled={
          totalPages === 0 ||
          currentPage >= totalPages ||
          isLoading
        }
        className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:hover:border-neutral-500"
      >
        次へ
      </button>
    </div>
  </div>
);
