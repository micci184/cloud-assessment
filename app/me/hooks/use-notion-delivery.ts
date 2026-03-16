import { useEffect, useRef, useState } from "react";

import type { NotionDeliveryJobSnapshot, NotionDeliveryState } from "../types";

const NOTION_STATUS_POLL_INTERVAL_MS = 1500;
const NOTION_STATUS_POLL_MAX_ATTEMPTS = 40;

const wait = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, ms);
    const handleAbort = (): void => {
      clearTimeout(timeoutId);
      reject(new DOMException("Aborted", "AbortError"));
    };

    if (!signal) {
      return;
    }
    if (signal.aborted) {
      handleAbort();
      return;
    }
    signal.addEventListener("abort", handleAbort, { once: true });
  });

const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === "AbortError";
};

type UseNotionDeliveryReturn = {
  deliveryStateMap: Record<string, NotionDeliveryState>;
  handleDeliverToNotion: (attemptId: string) => Promise<void>;
};

export const useNotionDelivery = (): UseNotionDeliveryReturn => {
  const [deliveryStateMap, setDeliveryStateMap] = useState<
    Record<string, NotionDeliveryState>
  >({});
  const isMountedRef = useRef(true);
  const pollControllersRef = useRef<Record<string, AbortController>>({});

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      for (const controller of Object.values(pollControllersRef.current)) {
        controller.abort();
      }
      pollControllersRef.current = {};
    };
  }, []);

  const setDeliveryState = (
    attemptId: string,
    state: NotionDeliveryState,
  ): void => {
    if (!isMountedRef.current) {
      return;
    }
    setDeliveryStateMap((prev) => ({ ...prev, [attemptId]: state }));
  };

  const handleDeliverToNotion = async (attemptId: string): Promise<void> => {
    pollControllersRef.current[attemptId]?.abort();
    const controller = new AbortController();
    pollControllersRef.current[attemptId] = controller;

    setDeliveryState(attemptId, {
      isSending: true,
      message: "",
      kind: null,
    });

    try {
      const response = await fetch(
        `/api/me/attempts/${attemptId}/deliver-notion`,
        { method: "POST", signal: controller.signal },
      );

      const data = (await response.json()) as {
        status?: string;
        message?: string;
        reason?: string;
        errorMessage?: string;
        job?: NotionDeliveryJobSnapshot;
      };

      if (!response.ok) {
        setDeliveryState(attemptId, {
          isSending: false,
          message:
            data.message ??
            data.errorMessage ??
            data.reason ??
            "Notion送信に失敗しました",
          kind: "error",
        });
        return;
      }

      if (data.status === "completed") {
        const isDuplicate = data.job?.duplicateDetected === true;
        setDeliveryState(attemptId, {
          isSending: false,
          message: isDuplicate
            ? "既に送信済みのため新規連携はありません"
            : "Notionに送信しました",
          kind: isDuplicate ? "error" : "success",
        });
        return;
      }

      if (data.status === "queued" || data.status === "in_progress") {
        setDeliveryState(attemptId, {
          isSending: true,
          message: "Notion送信ジョブを開始しました",
          kind: null,
        });
        await pollDeliveryStatus(attemptId, controller.signal);
        return;
      }

      setDeliveryState(attemptId, {
        isSending: false,
        message:
          data.message ?? data.reason ?? "Notion送信を開始できませんでした",
        kind: "error",
      });
    } catch (error: unknown) {
      if (isAbortError(error)) {
        return;
      }
      setDeliveryState(attemptId, {
        isSending: false,
        message: "通信に失敗しました",
        kind: "error",
      });
    } finally {
      if (pollControllersRef.current[attemptId] === controller) {
        delete pollControllersRef.current[attemptId];
      }
    }
  };

  const pollDeliveryStatus = async (
    attemptId: string,
    signal: AbortSignal,
  ): Promise<void> => {
    try {
      for (
        let pollCount = 0;
        pollCount < NOTION_STATUS_POLL_MAX_ATTEMPTS;
        pollCount += 1
      ) {
        if (signal.aborted) {
          return;
        }
        const statusResponse = await fetch(
          `/api/me/attempts/${attemptId}/deliver-notion`,
          { signal },
        );
        if (!statusResponse.ok) {
          setDeliveryState(attemptId, {
            isSending: false,
            message: "Notion送信ステータスの取得に失敗しました",
            kind: "error",
          });
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

        if (
          statusData.status === "queued" ||
          statusData.status === "in_progress"
        ) {
          setDeliveryState(attemptId, {
            isSending: true,
            message: `Notion送信中...${progressText}`,
            kind: null,
          });
          await wait(NOTION_STATUS_POLL_INTERVAL_MS, signal);
          continue;
        }

        if (statusData.status === "completed") {
          if (job?.duplicateDetected) {
            setDeliveryState(attemptId, {
              isSending: false,
              message: "既に送信済みのため新規連携はありません",
              kind: "error",
            });
            return;
          }
          setDeliveryState(attemptId, {
            isSending: false,
            message: "Notionに送信しました",
            kind: "success",
          });
          return;
        }

        if (statusData.status === "failed") {
          setDeliveryState(attemptId, {
            isSending: false,
            message:
              statusData.message ??
              job?.lastError ??
              (job?.failedQuestions
                ? `Notion送信に失敗しました（失敗 ${job.failedQuestions} 件）`
                : "Notion送信に失敗しました"),
            kind: "error",
          });
          return;
        }

        setDeliveryState(attemptId, {
          isSending: false,
          message: "Notion送信状態を確認できませんでした",
          kind: "error",
        });
        return;
      }

      setDeliveryState(attemptId, {
        isSending: false,
        message: "送信処理の完了待ちがタイムアウトしました",
        kind: "error",
      });
    } catch (error: unknown) {
      if (isAbortError(error)) {
        return;
      }
      setDeliveryState(attemptId, {
        isSending: false,
        message: "通信に失敗しました",
        kind: "error",
      });
    }
  };

  return { deliveryStateMap, handleDeliverToNotion };
};
