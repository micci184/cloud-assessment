"use client";

interface StickyNavProps {
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isFirst: boolean;
  isLast: boolean;
  canSubmit: boolean;
}

export function StickyNav({
  onPrev,
  onNext,
  onSubmit,
  isFirst,
  isLast,
  canSubmit,
}: StickyNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95 sm:static sm:mt-8 sm:border-t-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
        {/* Prev Button */}
        <button
          type="button"
          onClick={onPrev}
          disabled={isFirst}
          className={`
            flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-colors
            ${
              isFirst
                ? "cursor-not-allowed text-slate-400 dark:text-slate-600"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }
          `}
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
          Prev
        </button>

        {/* Next / Submit Button */}
        {isLast ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className={`
              flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all
              ${
                canSubmit
                  ? "bg-green-600 text-white shadow-lg hover:bg-green-700 hover:shadow-xl"
                  : "cursor-not-allowed bg-slate-300 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
              }
            `}
          >
            Submit
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
                d="M5 13l4 4L19 7"
              />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-xl"
          >
            Next
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
          </button>
        )}
      </div>
    </nav>
  );
}
