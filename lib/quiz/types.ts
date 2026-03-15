export type CategoryScore = {
  category: string;
  total: number;
  correct: number;
  percent: number;
};

export type QuestionBase = {
  id: string;
  category: string;
  level: number;
  questionText: string;
  choices: string[];
  answerIndex?: number;
  answerIndices?: number[];
  explanation?: string;
};

export type AnsweredQuestion = {
  attemptQuestionId: string;
  order: number;
  selectedIndex: number | null;
  selectedIndices?: number[] | null;
  isCorrect: boolean | null;
};
