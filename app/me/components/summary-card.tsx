type Props = {
  label: string;
  value: string;
  icon?: string;
  tone?: "emerald" | "blue" | "violet" | "amber";
};

const toneClassMap: Record<NonNullable<Props["tone"]>, string> = {
  emerald:
    "border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-900/15",
  blue: "border-sky-200/70 bg-sky-50/70 dark:border-sky-900/60 dark:bg-sky-900/15",
  violet:
    "border-violet-200/70 bg-violet-50/70 dark:border-violet-900/60 dark:bg-violet-900/15",
  amber:
    "border-amber-200/70 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-900/15",
};

export const SummaryCard = ({
  label,
  value,
  icon = "•",
  tone = "emerald",
}: Props) => {
  const toneClass = toneClassMap[tone];

  return (
    <article className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
        <span aria-hidden="true" className="text-sm">
          {icon}
        </span>
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        {value}
      </p>
    </article>
  );
};
