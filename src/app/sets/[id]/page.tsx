import Link from "next/link";
import { notFound } from "next/navigation";
import { mockQuizSets } from "@/lib/mock-data";

interface SetDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SetDetailPage({ params }: SetDetailPageProps) {
  const { id } = await params;
  const set = mockQuizSets.find((s) => s.id === id);

  if (!set) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors mb-8"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          ダッシュボードに戻る
        </Link>

        {/* Set Info Card */}
        <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            {set.title}
          </h1>
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">
            {set.description}
          </p>

          {/* Stats */}
          <div className="mt-6 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <svg
                  className="h-5 w-5 text-indigo-600 dark:text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {set.questions.length}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">問題数</p>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <div className="mt-8">
            <Link
              href={`/sets/${set.id}/quiz`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Start Practice
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </Link>
          </div>
        </article>

        {/* Questions Preview */}
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-200">
            問題プレビュー
          </h2>
          <ul className="space-y-3">
            {set.questions.map((q, index) => (
              <li
                key={q.id}
                className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
              >
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  {index + 1}
                </span>
                <span className="text-slate-700 dark:text-slate-300 line-clamp-1">
                  {q.text}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  return mockQuizSets.map((set) => ({
    id: set.id,
  }));
}
