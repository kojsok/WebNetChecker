import type { CheckResult, Target } from "@/types/checker";
import { statusLabel, terminalLine } from "@/lib/format";

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

export function parseTargetsJson(json: string): Target[] {
  const data = JSON.parse(json);
  if (!data.targets || !Array.isArray(data.targets)) {
    throw new Error("Invalid JSON format: missing targets array");
  }
  return data.targets;
}

export function parseTargetsCsv(csv: string): Target[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const targets: Target[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;
    const cells = line.split(","); // Simple split; real CSV needs a parser
    if (cells.length < 2) continue;

    const url = cells[1] as string;
    if (!url) continue;

    targets.push({
      id: `custom:${url}`,
      name: cells[0] || url,
      url: url,
      category: cells[2] || "custom",
      tags: cells[3] ? cells[3].split(";") : [],
      pinned: cells[4] === "true",
    });
  }
  return targets;
}
