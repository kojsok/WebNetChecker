"use client";

import { useCallback, useRef } from "react";
import { useScanStore } from "@/store/scan-store";
import type { ScanEvent } from "@/types/scan";
import type { Target } from "@/types/checker";

export function useScan() {
  const beginScan = useScanStore((s) => s.beginScan);
  const applyEvent = useScanStore((s) => s.applyEvent);
  const endScan = useScanStore((s) => s.endScan);
  const controllerRef = useRef<AbortController | null>(null);

  const start = useCallback(
    async (targets: readonly Target[]) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      beginScan(targets.length);

      try {
        const response = await fetch("/api/scan", {
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
          endScan();
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

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
              applyEvent(JSON.parse(trimmed) as ScanEvent);
            } catch {
              // Неполная строка — доберётся в следующем чанке.
            }
          }
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
        controllerRef.current = null;
      }
    },
    [applyEvent, beginScan, endScan],
  );

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    endScan();
  }, [endScan]);

  return { start, cancel };
}