type NotionDeliveryInput = {
  attemptId: string;
  status: "IN_PROGRESS" | "COMPLETED";
  questions: Array<{
    category: string;
    level: number;
    questionText: string;
    choices: string[];
    answerIndex: number;
    selectedIndex: number | null;
    isCorrect: boolean | null;
    explanation: string;
  }>;
};

type NotionConfig = {
  apiKey: string;
  databaseId: string;
  titlePropertyName: string;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
};

type NotionDeliveryResult =
  | { status: "sent"; attempts: number; duplicate: boolean }
  | { status: "skipped"; reason: "missing_config" }
  | { status: "failed"; attempts: number; errorMessage: string };

type NotionDeliveryFailureItem = {
  category: string;
  level: number;
  questionText: string;
  errorMessage: string;
};

type NotionDeliveryProgress = {
  totalQuestions: number;
  processedQuestions: number;
  successQuestions: number;
  failedQuestions: number;
  lastError: string | null;
};

type NotionDeliveryDetailedResult =
  | {
      status: "skipped";
      reason: "missing_config";
    }
  | {
      status: "completed";
      totalQuestions: number;
      processedQuestions: number;
      successQuestions: number;
      failedQuestions: number;
      duplicate: boolean;
      failures: NotionDeliveryFailureItem[];
    }
  | {
      status: "completed_with_errors";
      totalQuestions: number;
      processedQuestions: number;
      successQuestions: number;
      failedQuestions: number;
      duplicate: boolean;
      failures: NotionDeliveryFailureItem[];
    }
  | {
      status: "failed";
      totalQuestions: number;
      processedQuestions: number;
      successQuestions: number;
      failedQuestions: number;
      duplicate: boolean;
      failures: NotionDeliveryFailureItem[];
      errorMessage: string;
    };

type NotionQueryResponse = { results?: Array<{ id: string }> };

const getOptionalEnv = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const getNotionConfig = (): NotionConfig | null => {
  const apiKey = getOptionalEnv("NOTION_API_KEY");
  const databaseId = getOptionalEnv("NOTION_DATABASE_ID");

  if (!apiKey || !databaseId) {
    return null;
  }

  return {
    apiKey,
    databaseId,
    titlePropertyName: getOptionalEnv("NOTION_TITLE_PROPERTY_NAME") ?? "Name",
    maxRetries: parsePositiveInt(
      getOptionalEnv("NOTION_DELIVERY_MAX_RETRIES"),
      3,
    ),
    retryDelayMs: parsePositiveInt(
      getOptionalEnv("NOTION_DELIVERY_RETRY_DELAY_MS"),
      500,
    ),
    timeoutMs: parsePositiveInt(getOptionalEnv("NOTION_DELIVERY_TIMEOUT_MS"), 5000),
  };
};

const delay = async (ms: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const safeErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const parseStatusCodeFromError = (message: string): number | undefined => {
  const matched = message.match(/status=(\d+)/);
  if (!matched) {
    return undefined;
  }
  const statusCode = Number.parseInt(matched[1] ?? "", 10);
  if (!Number.isFinite(statusCode)) {
    return undefined;
  }
  return statusCode;
};

const shouldRetry = (statusCode: number | undefined): boolean => {
  if (!statusCode) {
    return true;
  }

  return statusCode === 429 || statusCode >= 500;
};

const toRichText = (value: string) => {
  return [
    {
      type: "text",
      text: {
        content: value.slice(0, 2000),
      },
    },
  ];
};

const notionRequest = async <TResponse>(
  config: NotionConfig,
  path: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; data: TResponse | null }> => {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.timeoutMs),
  });

  if (!response.ok) {
    return { ok: false, status: response.status, data: null };
  }

  const data = (await response.json()) as TResponse;
  return { ok: true, status: response.status, data };
};

const findQuestionRowInNotion = async (
  config: NotionConfig,
  attemptId: string,
  question: NotionDeliveryInput["questions"][number],
): Promise<boolean> => {
  const response = await notionRequest<NotionQueryResponse>(
    config,
    `/databases/${config.databaseId}/query`,
    {
      filter: {
        and: [
          {
            property: "attempt id",
            rich_text: {
              equals: attemptId,
            },
          },
          {
            property: "category",
            rich_text: {
              equals: question.category.slice(0, 2000),
            },
          },
          {
            property: "level",
            number: {
              equals: question.level,
            },
          },
          {
            property: "questionText",
            rich_text: {
              equals: question.questionText.slice(0, 2000),
            },
          },
        ],
      },
      page_size: 1,
    },
  );

  if (!response.ok) {
    throw new Error(`notion query failed: status=${response.status}`);
  }

  return (response.data?.results?.length ?? 0) > 0;
};

const createQuestionRow = async (
  config: NotionConfig,
  attemptId: string,
  question: NotionDeliveryInput["questions"][number],
): Promise<void> => {
  const selectedChoice =
    question.selectedIndex === null ? "" : (question.choices[question.selectedIndex] ?? "");
  const answerChoice = question.choices[question.answerIndex] ?? "";

  const response = await notionRequest(
    config,
    "/pages",
    {
      parent: { database_id: config.databaseId },
      properties: {
        [config.titlePropertyName]: {
          title: toRichText(question.questionText),
        },
        "attempt id": {
          rich_text: toRichText(attemptId),
        },
        category: {
          rich_text: toRichText(question.category),
        },
        level: {
          number: question.level,
        },
        questionText: {
          rich_text: toRichText(question.questionText),
        },
        selectedChoice: {
          rich_text: toRichText(selectedChoice),
        },
        answerChoice: {
          rich_text: toRichText(answerChoice),
        },
        isCorrect: {
          checkbox: question.isCorrect === true,
        },
        explanation: {
          rich_text: toRichText(question.explanation),
        },
      },
    },
  );

  if (!response.ok) {
    throw new Error(`notion create page failed: status=${response.status}`);
  }
};

const syncQuestionWithRetry = async (
  config: NotionConfig,
  input: NotionDeliveryInput,
  question: NotionDeliveryInput["questions"][number],
): Promise<{ ok: true; created: boolean } | { ok: false; errorMessage: string }> => {
  let attempts = 0;
  let lastErrorMessage = "unknown error";
  let lastStatusCode: number | undefined;

  while (attempts < config.maxRetries) {
    attempts += 1;
    try {
      const exists = await findQuestionRowInNotion(config, input.attemptId, question);
      if (exists) {
        return { ok: true, created: false };
      }

      await createQuestionRow(config, input.attemptId, question);
      return { ok: true, created: true };
    } catch (error: unknown) {
      lastErrorMessage = safeErrorMessage(error);
      lastStatusCode = parseStatusCodeFromError(lastErrorMessage);

      if (attempts >= config.maxRetries || !shouldRetry(lastStatusCode)) {
        break;
      }

      const waitMs = config.retryDelayMs * 2 ** (attempts - 1);
      await delay(waitMs);
    }
  }

  return {
    ok: false,
    errorMessage: lastErrorMessage,
  };
};

const toFailureItem = (
  question: NotionDeliveryInput["questions"][number],
  errorMessage: string,
): NotionDeliveryFailureItem => {
  return {
    category: question.category,
    level: question.level,
    questionText: question.questionText,
    errorMessage,
  };
};

const deliverAttemptResultToNotionDetailed = async (
  input: NotionDeliveryInput,
  onProgress?: (progress: NotionDeliveryProgress) => Promise<void> | void,
): Promise<NotionDeliveryDetailedResult> => {
  const config = getNotionConfig();

  if (!config) {
    return { status: "skipped", reason: "missing_config" };
  }

  const totalQuestions = input.questions.length;
  let processedQuestions = 0;
  let successQuestions = 0;
  let failedQuestions = 0;
  let createdCount = 0;
  let lastError: string | null = null;
  const failures: NotionDeliveryFailureItem[] = [];

  for (const question of input.questions) {
    const result = await syncQuestionWithRetry(config, input, question);
    processedQuestions += 1;

    if (result.ok) {
      successQuestions += 1;
      if (result.created) {
        createdCount += 1;
      }
    } else {
      failedQuestions += 1;
      lastError = result.errorMessage;
      failures.push(toFailureItem(question, result.errorMessage));
    }

    if (onProgress) {
      await onProgress({
        totalQuestions,
        processedQuestions,
        successQuestions,
        failedQuestions,
        lastError,
      });
    }
  }

  const duplicate = createdCount === 0 && failedQuestions === 0;
  if (failedQuestions > 0 && successQuestions === 0) {
    return {
      status: "failed",
      totalQuestions,
      processedQuestions,
      successQuestions,
      failedQuestions,
      duplicate,
      failures,
      errorMessage: lastError ?? "notion delivery failed",
    };
  }

  if (failedQuestions > 0) {
    return {
      status: "completed_with_errors",
      totalQuestions,
      processedQuestions,
      successQuestions,
      failedQuestions,
      duplicate,
      failures,
    };
  }

  return {
    status: "completed",
    totalQuestions,
    processedQuestions,
    successQuestions,
    failedQuestions,
    duplicate,
    failures,
  };
};

export const deliverAttemptResultToNotion = async (
  input: NotionDeliveryInput,
): Promise<NotionDeliveryResult> => {
  const result = await deliverAttemptResultToNotionDetailed(input);
  if (result.status === "skipped") {
    return result;
  }

  if (result.status === "completed") {
    return {
      status: "sent",
      attempts: 1,
      duplicate: result.duplicate,
    };
  }

  if (result.status === "completed_with_errors") {
    return {
      status: "failed",
      attempts: 1,
      errorMessage: `${result.failedQuestions}件の設問送信に失敗しました`,
    };
  }

  return {
    status: "failed",
    attempts: 1,
    errorMessage: result.errorMessage,
  };
};

export type {
  NotionDeliveryInput,
  NotionDeliveryFailureItem,
  NotionDeliveryProgress,
  NotionDeliveryDetailedResult,
};

export { deliverAttemptResultToNotionDetailed, getNotionConfig };
