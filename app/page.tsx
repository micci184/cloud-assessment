export default function Home() {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
      <h1 className="text-2xl font-bold">AWS理解度テスト MVP</h1>
      <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
        このIssueでは、Next.js + Tailwind + Prisma + PostgreSQL(docker-compose)
        の初期構築を行っています。
      </p>

      <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <li className="rounded-xl border border-black/10 p-4 dark:border-white/15">
          <p className="font-semibold">/login</p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-300">
            ログイン/サインアップ画面（次Issueで実装）
          </p>
        </li>
        <li className="rounded-xl border border-black/10 p-4 dark:border-white/15">
          <p className="font-semibold">/select</p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-300">
            問題条件を選択して受験開始（次Issueで実装）
          </p>
        </li>
        <li className="rounded-xl border border-black/10 p-4 dark:border-white/15">
          <p className="font-semibold">/quiz/[attemptId]</p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-300">
            1問ずつ回答するクイズ画面（次Issueで実装）
          </p>
        </li>
        <li className="rounded-xl border border-black/10 p-4 dark:border-white/15">
          <p className="font-semibold">/me</p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-300">
            受験履歴とカテゴリ別スコア表示（次Issueで実装）
          </p>
        </li>
      </ul>
    </section>
  );
}
