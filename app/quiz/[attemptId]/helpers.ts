import { getUserSelectedIndices } from "@/lib/quiz/helpers";

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

export { getUserSelectedIndices as getSelectedOriginalIndices };

export const isQuestionAnswered = (question: QuestionData): boolean => {
  return getUserSelectedIndices(question).length > 0;
};
