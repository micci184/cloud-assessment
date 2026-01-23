import { SetCard } from "@/components/SetCard";
import { mockQuizSets } from "@/lib/mock-data";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Cloud Assessment
          </h1>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
            クラウド資格試験の練習問題にチャレンジしよう
          </p>
        </header>

        {/* Set Grid */}
        <section>
          <h2 className="mb-6 text-xl font-semibold text-slate-800 dark:text-slate-200">
            問題セット一覧
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {mockQuizSets.map((set) => (
              <SetCard key={set.id} set={set} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
