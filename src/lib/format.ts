import type { CheckResult, CheckStatus } from "@/types/checker";

export const STATUS_LABELS: Record<CheckStatus, string> = {
  available: "ДОСТУПЕН",
  blocked: "ЗАБЛОКИРОВАН",
  timeout: "ТАЙМАУТ",
  dns_error: "ОШИБКА DNS",
  ssl_error: "ОШИБКА SSL",
  error: "ОШИБКА",
  pending: "ПРОВЕРЯЕТСЯ",
};

export const STATUS_EMOJI: Record<CheckStatus, string> = {
  available: "✅",
  blocked: "⛔",
  timeout: "⏱️",
  dns_error: "🌐",
  ssl_error: "🔒",
  error: "❌",
  pending: "⏳",
};

export function statusLabel(status: CheckStatus): string {
  return STATUS_LABELS[status];
}

export function statusEmoji(status: CheckStatus): string {
  return STATUS_EMOJI[status];
}

export function formatLatency(ms: number | null): string {
  if (ms === null) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms}ms`;
}

export function formatHttpStatus(status: number | null): string {
  return status === null ? "—" : String(status);
}

export function terminalLine(result: CheckResult): string {
  const emoji = statusEmoji(result.status);
  const latency = result.latencyMs !== null ? ` — ${result.latencyMs}ms` : "";
  const http =
    result.httpStatus !== null
      ? ` — ${result.httpStatus} OK`
      : result.errorMessage
        ? ` — ${result.errorMessage}`
        : "";
  return `${emoji} ${result.name} (${result.host})${latency}${http}`;
}

export function isHealthy(status: CheckStatus): boolean {
  return status === "available";
}

export function isFailed(status: CheckStatus): boolean {
  return status === "blocked" || status === "timeout" || status === "dns_error" || status === "ssl_error" || status === "error";
}