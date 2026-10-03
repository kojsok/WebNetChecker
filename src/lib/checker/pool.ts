/**
 * Run async tasks with a bounded concurrency pool.
 *
 * Results are yielded as they complete (not in input order), which is exactly
 * what the streaming scan API needs: the client receives each verdict the
 * moment it is ready.
 *
 * Supports cooperative cancellation via an `AbortSignal`.
 */
export async function* runPool<TInput, TOutput>(
  items: readonly TInput[],
  concurrency: number,
  worker: (item: TInput, signal: AbortSignal) => Promise<TOutput>,
  signal: AbortSignal,
): AsyncGenerator<TOutput, void, void> {
  const size = Math.max(1, Math.min(concurrency, items.length || 1));

  // Queue of pending resolvers feeding completed results to the consumer.
  const completed: TOutput[] = [];
  let notify: (() => void) | null = null;

  let cursor = 0;
  let active = 0;
  let finished = false;

  const wake = (): void => {
    if (notify) {
      const fn = notify;
      notify = null;
      fn();
    }
  };

  const pump = async (): Promise<void> => {
    while (cursor < items.length && !signal.aborted) {
      const index = cursor;
      cursor += 1;
      active += 1;
      const item = items[index] as TInput;
      try {
        const result = await worker(item, signal);
        completed.push(result);
      } finally {
        active -= 1;
        wake();
      }
    }
  };

  const runners: Promise<void>[] = [];
  for (let i = 0; i < size; i += 1) {
    runners.push(pump());
  }

  void Promise.all(runners).then(() => {
    finished = true;
    wake();
  });

  while (!finished || completed.length > 0) {
    if (completed.length > 0) {
      const next = completed.shift() as TOutput;
      yield next;
      continue;
    }
    if (signal.aborted && active === 0 && cursor >= items.length) {
      break;
    }
    await new Promise<void>((resolve) => {
      notify = resolve;
    });
  }
}

/**
 * Eager variant: resolves to an array of all results once the pool drains.
 * Useful for tests and non-streaming callers.
 */
export async function runPoolEager<TInput, TOutput>(
  items: readonly TInput[],
  concurrency: number,
  worker: (item: TInput, signal: AbortSignal) => Promise<TOutput>,
  signal: AbortSignal,
): Promise<TOutput[]> {
  const results: TOutput[] = [];
  for await (const result of runPool(items, concurrency, worker, signal)) {
    results.push(result);
  }
  return results;
}