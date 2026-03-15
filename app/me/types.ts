import type {
  AnsweredQuestion,
  CategoryScore,
  QuestionBase,
} from "@/lib/quiz/types";

export type AttemptFilters = {
  platform?: string;
  exam?: string;
  categories?: string[];
  level?: number;
  levels?: number[];
  count?: number;
  preset?: "cloud-practitioner";
};

export type AttemptSummary = {
  id: string;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  filters: AttemptFilters;
  startedAt: string;
  completedAt: string | null;
  result: {
    overallPercent: number;
    categoryBreakdown: CategoryScore[];
  } | null;
};

export type QuestionDetail = AnsweredQuestion & {
  question: QuestionBase;
};

export type AttemptDetail = AttemptSummary & {
  questions: QuestionDetail[];
};

export type NotionDeliveryState = {
  isSending: boolean;
  message: string;
  kind: "success" | "error" | null;
};

export type ExportState = {
  isExporting: boolean;
  message: string;
  kind: "success" | "error" | null;
};

export type MeStats = {
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
  recentCategoryProgress: CategoryScore[];
  weaknessRanking: Array<
    CategoryScore & {
      weaknessScore: number;
    }
  >;
};

export type MeProfile = {
  id: string;
  email: string;
};

export type MeTabKey = "summary" | "history";

export type NotionDeliveryJobSnapshot = {
  id: string;
  totalQuestions: number;
  processedQuestions: number;
  successQuestions: number;
  failedQuestions: number;
  duplicateDetected: boolean;
  lastError: string | null;
};
