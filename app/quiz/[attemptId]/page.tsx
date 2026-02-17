type QuizPageProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

export default async function QuizPage({ params }: QuizPageProps) {
  const { attemptId } = await params;

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
      <h1 className="text-xl font-semibold">/quiz/{attemptId}</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
        クイズ進行と採点は Issue #23 で実装します。
      </p>
    </section>
  );
}
