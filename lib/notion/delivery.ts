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
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
};

type NotionDeliveryResult =
  | { status: "sent"; attempts: number; duplicate: boolean }
  | { status: "skipped"; reason: "missing_config" }
  | { status: "failed"; attempts: number; errorMessage: string };

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
  questionText: string,
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
            property: "questionText",
            title: {
              equals: questionText.slice(0, 2000),
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
          title: toRichText(question.questionText),
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

const syncQuestionRows = async (
  config: NotionConfig,
  input: NotionDeliveryInput,
): Promise<number> => {
  let createdCount = 0;

  for (const question of input.questions) {
    const exists = await findQuestionRowInNotion(
      config,
      input.attemptId,
      question.questionText,
    );

    if (exists) {
      continue;
    }

    await createQuestionRow(config, input.attemptId, question);
    createdCount += 1;
  }

  return createdCount;
};

export const deliverAttemptResultToNotion = async (
  input: NotionDeliveryInput,
): Promise<NotionDeliveryResult> => {
  const config = getNotionConfig();

  if (!config) {
    return { status: "skipped", reason: "missing_config" };
  }

  let attempts = 0;
  let lastErrorMessage = "unknown error";
  let lastStatusCode: number | undefined;

  while (attempts < config.maxRetries) {
    attempts += 1;

    try {
      const createdCount = await syncQuestionRows(config, input);
      return { status: "sent", attempts, duplicate: createdCount === 0 };
    } catch (error: unknown) {
      const message = safeErrorMessage(error);
      lastErrorMessage = message;

      const matched = message.match(/status=(\d+)/);
      lastStatusCode = matched ? Number.parseInt(matched[1] ?? "", 10) : undefined;

      if (attempts >= config.maxRetries || !shouldRetry(lastStatusCode)) {
        break;
      }

      const waitMs = config.retryDelayMs * 2 ** (attempts - 1);
      await delay(waitMs);
    }
  }

  return {
    status: "failed",
    attempts,
    errorMessage: lastErrorMessage,
  };
};
