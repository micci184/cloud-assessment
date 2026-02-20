import { requireUser } from "@/lib/auth/guards";

import { QuizRunner } from "./quiz-runner";

type QuizPageProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

const QuizPage = async ({
  params,
}: QuizPageProps): Promise<React.ReactElement> => {
  await requireUser();

  const { attemptId } = await params;

  return <QuizRunner attemptId={attemptId} />;
};

export default QuizPage;
