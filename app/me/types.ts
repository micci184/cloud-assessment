import type { CategoryScore } from "@/lib/quiz/types";

export type AttemptFilters = {
  categories?: string[];
  level?: number;
  count?: number;
};

export type AttemptSummary = {
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

export type QuestionDetail = {
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
