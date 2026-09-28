export interface DayGroup<T> {
  dateLabel: string;
  items: T[];
}

/** Buckets already-date-sorted items by calendar day (UTC date, so a
 * day boundary doesn't shift with the server's local timezone). Items
 * with no date at all land in one trailing "No date" group. Assumes the
 * input is already sorted (newest first, undated last) — this only
 * groups, it doesn't re-sort. */
export function groupByDay<T>(items: T[], getDate: (item: T) => Date | null): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  let currentKey: string | null = null;

  for (const item of items) {
    const date = getDate(item);
    const key = date ? date.toISOString().slice(0, 10) : "no-date";

    if (key !== currentKey) {
      // Explicit locale, not `undefined` — this renders in a Server
      // Component first, then hydrates on the client. `undefined` means
      // "use the runtime's default locale," and the Node server process
      // and the browser can disagree on that (seen for real: server
      // produced "Sunday, September 6", browser produced "Sunday, 6
      // September"), which is a genuine SSR hydration-mismatch bug, not
      // just a cosmetic difference.
      const dateLabel = date
        ? date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
        : "No date";
      groups.push({ dateLabel, items: [] });
      currentKey = key;
    }
    groups[groups.length - 1].items.push(item);
  }

  return groups;
}
