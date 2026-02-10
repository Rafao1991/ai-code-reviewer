/** Demo: Inline retry logic — extract to reusable retry helper */
export async function saveWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempts = 0;
  const maxAttempts = 3;
  while (attempts < maxAttempts) {
    try {
      return await fn();
    } catch (e) {
      attempts++;
      if (attempts >= maxAttempts) throw e;
      await new Promise((r) => setTimeout(r, 1000 * attempts));
    }
  }
  throw new Error('Unreachable');
}
