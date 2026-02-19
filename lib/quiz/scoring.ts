type ScoringQuestion = {
  isCorrect: boolean | null;
  category: string;
};

type CategoryScore = {
  category: string;
  total: number;
  correct: number;
  percent: number;
};

type ScoringResult = {
  overallPercent: number;
  categoryBreakdown: CategoryScore[];
};

export function calculateScore(questions: ScoringQuestion[]): ScoringResult {
  const total = questions.length;

  if (total === 0) {
    return { overallPercent: 0, categoryBreakdown: [] };
  }

  const correctCount = questions.filter((q) => q.isCorrect === true).length;
  const overallPercent = Math.round((correctCount / total) * 100 * 10) / 10;

  const categoryMap = new Map<string, { total: number; correct: number }>();

  for (const question of questions) {
    const existing = categoryMap.get(question.category);

    if (existing) {
      existing.total += 1;
      if (question.isCorrect === true) {
        existing.correct += 1;
      }
    } else {
      categoryMap.set(question.category, {
        total: 1,
        correct: question.isCorrect === true ? 1 : 0,
      });
    }
  }

  const categoryBreakdown: CategoryScore[] = Array.from(
    categoryMap.entries(),
  ).map(([category, stats]) => ({
    category,
    total: stats.total,
    correct: stats.correct,
    percent: Math.round((stats.correct / stats.total) * 100 * 10) / 10,
  }));

  return { overallPercent, categoryBreakdown };
}
