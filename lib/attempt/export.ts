type AttemptFilters = {
  categories?: string[];
  level?: number;
  count?: number;
};

type CategoryBreakdownItem = {
  category: string;
  total: number;
  correct: number;
  percent: number;
};

type ExportQuestionItem = {
  order: number;
  category: string;
  level: number;
  questionText: string;
  choices: string[];
  answerIndex: number;
  selectedIndex: number | null;
  isCorrect: boolean | null;
  explanation: string;
};

export type AttemptExportPayload = {
  attemptId: string;
  status: "IN_PROGRESS" | "COMPLETED";
  startedAt: string;
  completedAt: string | null;
  filters: AttemptFilters;
  result: {
    overallPercent: number;
    categoryBreakdown: CategoryBreakdownItem[];
  } | null;
  questions: ExportQuestionItem[];
};

type CreatePayloadInput = {
  attemptId: string;
  status: "IN_PROGRESS" | "COMPLETED";
  startedAt: Date;
  completedAt: Date | null;
  filters: AttemptFilters;
  result:
    | {
        overallPercent: number;
        categoryBreakdown: CategoryBreakdownItem[];
      }
    | null;
  questions: ExportQuestionItem[];
};

const escapeCsvValue = (value: string | number | null): string => {
  if (value === null) {
    return "";
  }

  const text = String(value);

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }

  return text;
};

export const createAttemptExportPayload = (
  input: CreatePayloadInput,
): AttemptExportPayload => {
  return {
    attemptId: input.attemptId,
    status: input.status,
    startedAt: input.startedAt.toISOString(),
    completedAt: input.completedAt ? input.completedAt.toISOString() : null,
    filters: input.filters,
    result: input.result,
    questions: input.questions,
  };
};

export const createAttemptExportCsv = (payload: AttemptExportPayload): string => {
  const lines: string[] = [];

  lines.push("section,key,value");
  lines.push(`meta,attemptId,${escapeCsvValue(payload.attemptId)}`);
  lines.push(`meta,status,${escapeCsvValue(payload.status)}`);
  lines.push(`meta,startedAt,${escapeCsvValue(payload.startedAt)}`);
  lines.push(`meta,completedAt,${escapeCsvValue(payload.completedAt)}`);
  lines.push(
    `meta,overallPercent,${escapeCsvValue(payload.result?.overallPercent ?? null)}`,
  );
  lines.push(`meta,filters,${escapeCsvValue(JSON.stringify(payload.filters))}`);

  if (payload.result?.categoryBreakdown) {
    for (const item of payload.result.categoryBreakdown) {
      lines.push(
        `categoryBreakdown,${escapeCsvValue(item.category)},${escapeCsvValue(
          `${item.correct}/${item.total} (${item.percent}%)`,
        )}`,
      );
    }
  }

  lines.push(
    "questions,order,category,level,questionText,selectedChoice,answerChoice,isCorrect,explanation",
  );

  for (const question of payload.questions) {
    const selectedChoice =
      question.selectedIndex === null
        ? null
        : question.choices[question.selectedIndex] ?? null;
    const answerChoice = question.choices[question.answerIndex] ?? "";

    lines.push(
      [
        "question",
        escapeCsvValue(question.order),
        escapeCsvValue(question.category),
        escapeCsvValue(question.level),
        escapeCsvValue(question.questionText),
        escapeCsvValue(selectedChoice),
        escapeCsvValue(answerChoice),
        escapeCsvValue(
          question.isCorrect === null ? null : question.isCorrect ? "true" : "false",
        ),
        escapeCsvValue(question.explanation),
      ].join(","),
    );
  }

  return lines.join("\n");
};
