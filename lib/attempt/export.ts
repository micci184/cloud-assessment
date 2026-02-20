type ExportQuestion = {
  order: number;
  selectedIndex: number | null;
  isCorrect: boolean | null;
  question: {
    category: string;
    level: number;
    questionText: string;
    choices: unknown;
    answerIndex: number;
    explanation: string;
  };
};

type ExportAttempt = {
  id: string;
  status: "IN_PROGRESS" | "COMPLETED";
  startedAt: Date;
  completedAt: Date | null;
  result: {
    overallPercent: number;
    categoryBreakdown: unknown;
  } | null;
  questions: ExportQuestion[];
};

export type AttemptExportPayload = {
  attemptId: string;
  status: "IN_PROGRESS" | "COMPLETED";
  startedAt: string;
  completedAt: string | null;
  overallPercent: number | null;
  categoryBreakdown: unknown | null;
  questions: Array<{
    order: number;
    category: string;
    level: number;
    questionText: string;
    choices: string[];
    selectedIndex: number | null;
    answerIndex: number;
    isCorrect: boolean | null;
    explanation: string;
  }>;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item));
};

export const createAttemptExportPayload = (
  attempt: ExportAttempt,
): AttemptExportPayload => {
  return {
    attemptId: attempt.id,
    status: attempt.status,
    startedAt: attempt.startedAt.toISOString(),
    completedAt: attempt.completedAt?.toISOString() ?? null,
    overallPercent: attempt.result?.overallPercent ?? null,
    categoryBreakdown: attempt.result?.categoryBreakdown ?? null,
    questions: attempt.questions.map((aq) => ({
      order: aq.order,
      category: aq.question.category,
      level: aq.question.level,
      questionText: aq.question.questionText,
      choices: toStringArray(aq.question.choices),
      selectedIndex: aq.selectedIndex,
      answerIndex: aq.question.answerIndex,
      isCorrect: aq.isCorrect,
      explanation: aq.question.explanation,
    })),
  };
};

const escapeCsv = (value: string): string => {
  return `"${value.replace(/"/g, '""')}"`;
};

export const createAttemptExportCsv = (payload: AttemptExportPayload): string => {
  const header = [
    "attemptId",
    "status",
    "startedAt",
    "completedAt",
    "overallPercent",
    "categoryBreakdown",
    "order",
    "category",
    "level",
    "questionText",
    "choices",
    "selectedIndex",
    "answerIndex",
    "isCorrect",
    "explanation",
  ].join(",");

  const rows = payload.questions.map((question) => {
    const columns = [
      payload.attemptId,
      payload.status,
      payload.startedAt,
      payload.completedAt ?? "",
      payload.overallPercent === null ? "" : String(payload.overallPercent),
      payload.categoryBreakdown === null
        ? ""
        : JSON.stringify(payload.categoryBreakdown),
      String(question.order),
      question.category,
      String(question.level),
      question.questionText,
      question.choices.join(" | "),
      question.selectedIndex === null ? "" : String(question.selectedIndex),
      String(question.answerIndex),
      question.isCorrect === null ? "" : String(question.isCorrect),
      question.explanation,
    ];

    return columns.map((column) => escapeCsv(column)).join(",");
  });

  return [header, ...rows].join("\n");
};
