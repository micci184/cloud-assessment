import type {
  AnsweredQuestion,
  CategoryScore,
  QuestionBase,
} from "@/lib/quiz/types";

export type QuestionData = AnsweredQuestion & {
  choiceOrder?: number[];
  question: QuestionBase & {
    questionType: "SINGLE" | "MULTIPLE";
  };
};

export type ResultData = {
  overallPercent: number;
  categoryBreakdown: CategoryScore[];
};

export type AttemptData = {
  id: string;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  questions: QuestionData[];
  result: ResultData | null;
};

export type QuizRunnerProps = {
  attemptId: string;
};
