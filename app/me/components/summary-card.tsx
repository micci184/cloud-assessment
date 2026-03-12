type Props = {
  label: string;
  value: string;
};

export const SummaryCard = ({ label, value }: Props) => {
  return (
    <article className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-black/50">
      <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        {value}
      </p>
    </article>
  );
};
