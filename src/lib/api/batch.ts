export async function forEachSafe<T>(
  items: T[],
  fn: (item: T) => Promise<void>
): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await fn(item);
      succeeded++;
    } catch (error) {
      console.error("forEachSafe item failed:", error);
      failed++;
    }
  }

  return { succeeded, failed };
}
