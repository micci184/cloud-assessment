import { useState } from "react";

import type { ExportState } from "../types";

type UseExportReturn = {
  exportStateMap: Record<string, ExportState>;
  handleExportAttempt: (
    attemptId: string,
    format: "csv" | "json",
  ) => Promise<void>;
};

export const useExport = (): UseExportReturn => {
  const [exportStateMap, setExportStateMap] = useState<
    Record<string, ExportState>
  >({});

  const setExportState = (attemptId: string, state: ExportState): void => {
    setExportStateMap((prev) => ({ ...prev, [attemptId]: state }));
  };

  const handleExportAttempt = async (
    attemptId: string,
    format: "csv" | "json",
  ): Promise<void> => {
    setExportState(attemptId, {
      isExporting: true,
      message: "",
      kind: null,
    });

    try {
      const response = await fetch(
        `/api/me/attempts/${attemptId}/export?format=${format}`,
      );

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setExportState(attemptId, {
          isExporting: false,
          message: data.message ?? "エクスポートに失敗しました",
          kind: "error",
        });
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

      setExportState(attemptId, {
        isExporting: false,
        message: `${format.toUpperCase()}をダウンロードしました`,
        kind: "success",
      });
    } catch {
      setExportState(attemptId, {
        isExporting: false,
        message: "通信に失敗しました",
        kind: "error",
      });
    }
  };

  return { exportStateMap, handleExportAttempt };
};
