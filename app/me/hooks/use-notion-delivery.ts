import { useState } from "react";

import type { NotionDeliveryJobSnapshot, NotionDeliveryState } from "../types";

const NOTION_STATUS_POLL_INTERVAL_MS = 1500;
const NOTION_STATUS_POLL_MAX_ATTEMPTS = 40;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

type UseNotionDeliveryReturn = {
  deliveryStateMap: Record<string, NotionDeliveryState>;
  handleDeliverToNotion: (attemptId: string) => Promise<void>;
};

export const useNotionDelivery = (): UseNotionDeliveryReturn => {
  const [deliveryStateMap, setDeliveryStateMap] = useState<
    Record<string, NotionDeliveryState>
  >({});

  const setDeliveryState = (
    attemptId: string,
    state: NotionDeliveryState,
  ): void => {
    setDeliveryStateMap((prev) => ({ ...prev, [attemptId]: state }));
  };

  const handleDeliverToNotion = async (attemptId: string): Promise<void> => {
    setDeliveryState(attemptId, {
      isSending: true,
      message: "",
      kind: null,
    });

    try {
      const response = await fetch(
        `/api/me/attempts/${attemptId}/deliver-notion`,
        { method: "POST" },
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
        await pollDeliveryStatus(attemptId);
        return;
      }

      setDeliveryState(attemptId, {
        isSending: false,
        message:
          data.message ?? data.reason ?? "Notion送信を開始できませんでした",
        kind: "error",
      });
    } catch {
      setDeliveryState(attemptId, {
        isSending: false,
        message: "通信に失敗しました",
        kind: "error",
      });
    }
  };

  const pollDeliveryStatus = async (attemptId: string): Promise<void> => {
    for (
      let pollCount = 0;
      pollCount < NOTION_STATUS_POLL_MAX_ATTEMPTS;
      pollCount += 1
    ) {
      const statusResponse = await fetch(
        `/api/me/attempts/${attemptId}/deliver-notion`,
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
        await wait(NOTION_STATUS_POLL_INTERVAL_MS);
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
  };

  return { deliveryStateMap, handleDeliverToNotion };
};
