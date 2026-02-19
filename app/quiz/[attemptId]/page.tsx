import { requireUser } from "@/lib/auth/guards";

import { QuizRunner } from "./quiz-runner";

type QuizPageProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

export default async function QuizPage({ params }: QuizPageProps) {
  await requireUser();

  const { attemptId } = await params;

  return <QuizRunner attemptId={attemptId} />;
}
