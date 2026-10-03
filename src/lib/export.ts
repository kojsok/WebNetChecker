import { z } from "zod";
import type { CheckResult, Target } from "@/types/checker";
import { statusLabel, terminalLine } from "@/lib/format";

/** Shape accepted from an imported targets file; everything else is rejected. */
const importedTargetSchema = z.object({
  id: z.string().max(200).optional(),
  name: z.string().max(120).optional(),
  url: z.string().min(1).max(2048),
  category: z.string().max(60).optional(),
  tags: z.array(z.string().max(60)).max(20).optional(),
  pinned: z.boolean().optional(),
});

export interface ParseTargetsResult {
  targets: Target[];
  /** Rows present in the file but rejected by the schema. */
  invalid: number;
  /** True when the whole file could not be interpreted at all. */
  fatal: string | null;
}

export interface ExportRow {
  name: string;
  host: string;
  url: string;
  status: string;
  latencyMs: number | null;
  httpStatus: number | null;
  checkedAt: string;
}

export function toRows(results: readonly CheckResult[]): ExportRow[] {
  return results.map((result) => ({
    name: result.name,
    host: result.host,
    url: result.url,
    status: statusLabel(result.status),
    latencyMs: result.latencyMs,
    httpStatus: result.httpStatus,
    checkedAt: result.checkedAt,
  }));
}

function csvCell(value: string | number | null): string {
  if (value === null) return "";
  const text = String(value);
  if (/[",\n;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(results: readonly CheckResult[]): string {
  const header = ["name", "host", "url", "status", "latencyMs", "httpStatus", "checkedAt"];
  const lines = [header.join(",")];
  for (const row of toRows(results)) {
    lines.push(
      [
        csvCell(row.name),
        csvCell(row.host),
        csvCell(row.url),
        csvCell(row.status),
        csvCell(row.latencyMs),
        csvCell(row.httpStatus),
        csvCell(row.checkedAt),
      ].join(","),
    );
  }
  return lines.join("\n");
}

export function toJson(results: readonly CheckResult[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      count: results.length,
      results: toRows(results),
    },
    null,
    2,
  );
}

export function toText(results: readonly CheckResult[]): string {
  const header = `WebNetChecker — ${results.length} целей, ${new Date().toLocaleString("ru-RU")}`;
  return [header, ...results.map((result) => terminalLine(result))].join("\n");
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function timestampSlug(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

export function targetsToJson(targets: readonly Target[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      count: targets.length,
      targets,
    },
    null,
    2,
  );
}

export function targetsToCsv(targets: readonly Target[]): string {
  const header = ["name", "url", "category", "tags", "pinned"];
  const lines = [header.join(",")];
  for (const target of targets) {
    lines.push(
      [
        csvCell(target.name),
        csvCell(target.url),
        csvCell(target.category),
        csvCell(target.tags.join(";")),
        csvCell(String(target.pinned)),
      ].join(","),
    );
  }
  return lines.join("\n");
}

type ImportedTarget = z.infer<typeof importedTargetSchema>;

function toTarget(row: ImportedTarget): Target {
  return {
    id: row.id ?? `custom:${row.url}`,
    name: row.name ?? row.url,
    url: row.url,
    category: row.category ?? "custom",
    tags: row.tags ?? [],
    pinned: row.pinned ?? false,
  };
}

export function parseTargetsJson(json: string): ParseTargetsResult {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { targets: [], invalid: 0, fatal: "Файл не является корректным JSON" };
  }
  const targets = (data as { targets?: unknown })?.targets;
  if (!Array.isArray(targets)) {
    return { targets: [], invalid: 0, fatal: "В JSON нет массива targets" };
  }

  const parsed = z.array(importedTargetSchema).safeParse(targets);
  if (!parsed.success) {
    // Keep the valid prefix so partial files still import their good rows.
    const valid: Target[] = [];
    for (const entry of targets) {
      const row = importedTargetSchema.safeParse(entry);
      if (!row.success) break;
      valid.push(toTarget(row.data));
    }
    return { targets: valid, invalid: targets.length - valid.length, fatal: null };
  }
  return { targets: parsed.data.map(toTarget), invalid: 0, fatal: null };
}

export function parseTargetsCsv(csv: string): ParseTargetsResult {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { targets: [], invalid: 0, fatal: null };

  const targets: Target[] = [];
  let invalid = 0;
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;
    const cells = line.split(","); // Simple split; real CSV needs a parser
    if (cells.length < 2) {
      invalid += 1;
      continue;
    }

    const row = importedTargetSchema.safeParse({
      name: cells[0] || undefined,
      url: cells[1] ?? "",
      category: cells[2] || undefined,
      tags: cells[3] ? cells[3].split(";") : [],
      pinned: cells[4] === "true",
    });
    if (!row.success) {
      invalid += 1;
      continue;
    }
    targets.push(toTarget(row.data));
  }
  return { targets, invalid, fatal: null };
}
