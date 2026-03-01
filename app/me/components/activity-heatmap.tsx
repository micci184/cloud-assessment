const getHeatLevel = (count: number, maxCount: number): string => {
  if (count === 0) {
    return "bg-neutral-200 dark:bg-neutral-700";
  }
  if (count <= maxCount * 0.33) {
    return "bg-brand-200 dark:bg-brand-400/35";
  }
  if (count <= maxCount * 0.66) {
    return "bg-brand-300 dark:bg-brand-400/60";
  }
  return "bg-brand-500 dark:bg-brand-300";
};

type Props = {
  items: Array<{ date: string; count: number }>;
};

export const ActivityHeatmap = ({ items }: Props) => {
  const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);
  const activityByDate = new Map(items.map((item) => [item.date, item.count]));
  const totalContributions = items.reduce((sum, item) => sum + item.count, 0);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const oneYearAgo = new Date(today);
  oneYearAgo.setUTCDate(today.getUTCDate() - 364);
  const firstGridDate = new Date(oneYearAgo);
  const mondayOffset = (firstGridDate.getUTCDay() + 6) % 7;
  firstGridDate.setUTCDate(firstGridDate.getUTCDate() - mondayOffset);

  const columns: Array<Array<{ date: string; count: number; isInRange: boolean }>> = [];
  const cursor = new Date(firstGridDate);
  while (cursor <= today) {
    const week: Array<{ date: string; count: number; isInRange: boolean }> = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const key = toDateKey(cursor);
      const isInRange = cursor >= oneYearAgo && cursor <= today;
      week.push({
        date: key,
        count: isInRange ? (activityByDate.get(key) ?? 0) : 0,
        isInRange,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    columns.push(week);
  }

  const weekCount = columns.length;
  const heatmapCellSize = 10;
  const heatmapGapSize = 2;
  const heatmapGridTemplate = `repeat(${weekCount}, ${heatmapCellSize}px)`;
  const maxCount = Math.max(
    ...columns.flatMap((week) =>
      week.filter((day) => day.isInRange).map((day) => day.count),
    ),
    1,
  );

  const monthLabels = columns.map((week, weekIndex) => {
    const firstInRangeDay = week.find((day) => day.isInRange);
    if (!firstInRangeDay) {
      return "";
    }
    const date = new Date(firstInRangeDay.date);
    const month = date.getUTCMonth();
    const prevFirstDay = columns[weekIndex - 1]?.find((day) => day.isInRange);
    const prevMonth =
      prevFirstDay === undefined ? -1 : new Date(prevFirstDay.date).getUTCMonth();
    return month !== prevMonth
      ? date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })
      : "";
  });
  const weekdayLabels: string[] = ["Mon", "", "Wed", "", "Fri", "", ""];

  return (
    <article className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-black/50">
      <h2 className="mb-1 text-lg font-semibold">学習アクティビティ</h2>
      <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
        {totalContributions.toLocaleString("en-US")} contributions in the last year
      </p>
      <div className="overflow-x-auto pb-1">
        <div className="min-w-max rounded-lg border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-neutral-900/40">
          <div className="flex flex-col gap-2">
            <div
              className="ml-7 grid"
              style={{
                gridTemplateColumns: heatmapGridTemplate,
                columnGap: `${heatmapGapSize}px`,
              }}
            >
              {monthLabels.map((label, index) => (
                <span
                  key={`${label}-${index}`}
                  className="text-[10px] leading-none text-neutral-500 dark:text-neutral-400"
                >
                  {label}
                </span>
              ))}
            </div>
            <div className="flex gap-1.5">
              <div className="grid grid-rows-7 items-center text-[10px] text-neutral-500 dark:text-neutral-400">
                {weekdayLabels.map((label, index) => (
                  <span key={`${label}-${index}`} className="h-2.5 leading-none">
                    {label}
                  </span>
                ))}
              </div>
              <div className="inline-flex gap-0.5">
                {columns.map((week, columnIndex) => (
                  <div key={columnIndex} className="grid grid-rows-7 gap-0.5">
                    {week.map((item) => {
                      if (!item.isInRange) {
                        return (
                          <div
                            key={item.date}
                            className="h-2.5 w-2.5 rounded-[2px] bg-transparent"
                            aria-hidden="true"
                          />
                        );
                      }

                      const level = getHeatLevel(item.count, maxCount);
                      return (
                        <div
                          key={item.date}
                          title={`${item.date}: ${item.count}問`}
                          aria-label={`${item.date}に${item.count}問回答`}
                          className={`h-2.5 w-2.5 rounded-[2px] ${level}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <span>Less</span>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-neutral-200 dark:bg-neutral-700" />
          <span className="h-3 w-3 rounded-sm bg-brand-200 dark:bg-brand-400/35" />
          <span className="h-3 w-3 rounded-sm bg-brand-300 dark:bg-brand-400/60" />
          <span className="h-3 w-3 rounded-sm bg-brand-500 dark:bg-brand-300" />
        </div>
        <span>More</span>
      </div>
    </article>
  );
};
