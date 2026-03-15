import type { CategoryScore } from "@/lib/quiz/types";

export type QuestionData = {
  attemptQuestionId: string;
  order: number;
  choiceOrder?: number[];
  selectedIndex: number | null;
  selectedIndices: number[] | null;
  isCorrect: boolean | null;
  question: {
    id: string;
    category: string;
    level: number;
    questionType: "SINGLE" | "MULTIPLE";
    questionText: string;
    choices: string[];
    answerIndex?: number;
    answerIndices?: number[];
    explanation?: string;
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
