import type { QuestionData } from "./types";

export const getChoiceOrder = (question: QuestionData): number[] => {
  const choicesCount = question.question.choices.length;
  const fallbackOrder = Array.from(
    { length: choicesCount },
    (_, index) => index,
  );
  const choiceOrder = question.choiceOrder;

  if (!choiceOrder || choiceOrder.length !== choicesCount) {
    return fallbackOrder;
  }

  const hasOutOfRange = choiceOrder.some(
    (index) => index < 0 || index >= choicesCount,
  );
  if (hasOutOfRange) {
    return fallbackOrder;
  }

  if (new Set(choiceOrder).size !== choicesCount) {
    return fallbackOrder;
  }

  return choiceOrder;
};

export const isMultipleChoiceQuestion = (question: QuestionData): boolean => {
  return question.question.questionType === "MULTIPLE";
};

export const getSelectedOriginalIndices = (
  question: QuestionData,
): number[] => {
  if (question.selectedIndices && question.selectedIndices.length > 0) {
    return [...question.selectedIndices].sort((a, b) => a - b);
  }

  if (question.selectedIndex !== null) {
    return [question.selectedIndex];
  }

  return [];
};

export const isQuestionAnswered = (question: QuestionData): boolean => {
  return getSelectedOriginalIndices(question).length > 0;
};
