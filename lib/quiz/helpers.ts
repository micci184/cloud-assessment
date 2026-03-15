import type { AnsweredQuestion, QuestionBase } from "./types";

export const getAnswerIndices = (question: QuestionBase): number[] => {
  if (question.answerIndices && question.answerIndices.length > 0) {
    return [...question.answerIndices];
  }
  if (question.answerIndex !== undefined) {
    return [question.answerIndex];
  }
  return [];
};

export const getUserSelectedIndices = (
  answered: Pick<AnsweredQuestion, "selectedIndex" | "selectedIndices">,
): number[] => {
  if (answered.selectedIndices && answered.selectedIndices.length > 0) {
    return [...answered.selectedIndices].sort((a, b) => a - b);
  }
  if (answered.selectedIndex !== null) {
    return [answered.selectedIndex];
  }
  return [];
};
