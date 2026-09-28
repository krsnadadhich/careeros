/** Runs `fn` over `items` with at most `limit` calls in flight at once —
 * a fixed pool of workers pulling from a shared cursor, not
 * `Promise.all(items.map(fn))` (uncapped) and not fixed-size chunking (one
 * slow item stalls the rest of its chunk instead of freeing a slot for the
 * next item). Results are written back by original index, so the returned
 * array preserves input order regardless of completion order. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}
