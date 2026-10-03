import { describe, expect, it } from "vitest";
import { runPoolEager } from "@/lib/checker/pool";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("runPoolEager", () => {
  it("processes every item", async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await runPoolEager(
      items,
      2,
      async (n) => {
        await delay(5);
        return n * 2;
      },
      new AbortController().signal,
    );
    expect(results.sort((a, b) => a - b)).toEqual([2, 4, 6, 8, 10]);
  });

  it("never exceeds the concurrency limit", async () => {
    let active = 0;
    let maxActive = 0;
    const items = Array.from({ length: 20 }, (_, i) => i);

    await runPoolEager(
      items,
      3,
      async (n) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await delay(10);
        active -= 1;
        return n;
      },
      new AbortController().signal,
    );

    expect(maxActive).toBeLessThanOrEqual(3);
  });

  it("returns an empty array for empty input", async () => {
    const results = await runPoolEager(
      [],
      5,
      async (n: number) => n,
      new AbortController().signal,
    );
    expect(results).toEqual([]);
  });

  it("stops early when the signal is aborted", async () => {
    const controller = new AbortController();
    const processed: number[] = [];
    const items = Array.from({ length: 50 }, (_, i) => i);

    const promise = runPoolEager(
      items,
      2,
      async (n) => {
        processed.push(n);
        await delay(5);
        return n;
      },
      controller.signal,
    );

    setTimeout(() => controller.abort(), 20);
    await promise;

    expect(processed.length).toBeLessThan(items.length);
  });
});