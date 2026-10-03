"use client";

import { useCallback, useRef } from "react";
import { useScanStore } from "@/store/scan-store";
import { useHistory } from "@/hooks/useHistory";
import type { ScanEvent } from "@/types/scan";
import type { CheckResult, Target } from "@/types/checker";

interface StartOptions {
  /**
   * true — изолированный мини-скан (перепроверка одной цели, сравнение):
   * не прерывает главный скан, не сбрасывает его прогресс и не пишет историю.
   */
  isolated?: boolean;
}

export function useScan() {
  const beginScan = useScanStore((s) => s.beginScan);
  const beginIsolatedScan = useScanStore((s) => s.beginIsolatedScan);
  const applyEvent = useScanStore((s) => s.applyEvent);
  const applyResult = useScanStore((s) => s.applyResult);
  const endScan = useScanStore((s) => s.endScan);
  const { push: pushHistory } = useHistory();

  const mainControllerRef = useRef<AbortController | null>(null);
  const miniControllerRef = useRef<AbortController | null>(null);

  const readStream = useCallback(
    async (
      body: ReadableStream<Uint8Array>,
      handleEvent: (event: ScanEvent) => void,
    ): Promise<CheckResult[]> => {
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const collected: CheckResult[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const event = JSON.parse(trimmed) as ScanEvent;
            handleEvent(event);
            if (event.type === "result") collected.push(event.result);
          } catch {
            // Некорректная строка стрима — пропускаем, буферизация уже сделана.
          }
        }
      }
      return collected;
    },
    [],
  );

  const start = useCallback(
    async (targets: readonly Target[], options?: StartOptions) => {
      const isolated = options?.isolated ?? false;
      const controller = new AbortController();

      if (isolated) {
        // Мини-скан живёт со своим контроллером: главный скан продолжается.
        miniControllerRef.current?.abort();
        miniControllerRef.current = controller;
        beginIsolatedScan();
      } else {
        // Новый главный скан отменяет прежний главный и незавершённые ретраи.
        mainControllerRef.current?.abort();
        miniControllerRef.current?.abort();
        mainControllerRef.current = controller;
        beginScan(targets.length, targets.map((t) => t.url));
      }

      const handleEvent = isolated
        ? (event: ScanEvent) => {
            // Изолированный скан обновляет только результаты: чужой прогресс
            // и глобальную историю он не трогает.
            if (event.type === "result") applyResult(event.result);
            else if (event.type === "error") applyEvent(event);
          }
        : applyEvent;

      try {
        // Same-origin UI endpoint: SCAN_API_KEY (if configured) is applied
        // server-side, so the dashboard keeps working when the key is set.
        const response = await fetch("/api/scan/run", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            targets: targets.map((t) => ({ name: t.name, url: t.url, category: t.category })),
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const message = response.ok ? "Сервер не вернул поток" : `Ошибка ${response.status}`;
          applyEvent({ type: "error", message });
          return;
        }

        const collected = await readStream(response.body, handleEvent);

        // История — ровно один раз за главный скан и только его результаты:
        // скоуп берём из снапшота beginScan, а не из накопленного order.
        if (!isolated && collected.length > 0) {
          pushHistory(collected);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          applyEvent({
            type: "error",
            message: error instanceof Error ? error.message : "Неизвестная ошибка",
          });
        }
      } finally {
        endScan();
        if (isolated && miniControllerRef.current === controller) {
          miniControllerRef.current = null;
        } else if (!isolated && mainControllerRef.current === controller) {
          mainControllerRef.current = null;
        }
      }
    },
    [applyEvent, applyResult, beginIsolatedScan, beginScan, endScan, pushHistory, readStream],
  );

  const cancel = useCallback(() => {
    // Каждый прерванный поток сам вызовет endScan в своём finally.
    mainControllerRef.current?.abort();
    miniControllerRef.current?.abort();
    mainControllerRef.current = null;
    miniControllerRef.current = null;
  }, []);

  return { start, cancel };
}