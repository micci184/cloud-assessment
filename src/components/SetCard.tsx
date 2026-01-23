import Link from "next/link";
import type { QuizSet } from "@/lib/types";

interface SetCardProps {
  set: QuizSet;
}

export function SetCard({ set }: SetCardProps) {
  return (
    <article className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {set.title}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
          {set.description}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {set.questions.length} 問
        </span>
        <Link
          href={`/sets/${set.id}`}
          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Start
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>
    </article>
  );
}
