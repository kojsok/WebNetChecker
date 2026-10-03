import type { CheckStatus, ErrorKind } from "@/types/checker";

/** Node.js `errno` values we can map to a precise error kind. */
const DNS_CODES = new Set([
  "ENOTFOUND",
  "EAI_AGAIN",
  "EAI_FAIL",
  "EAI_NODATA",
  "ENODATA",
  "ESERVFAIL",
]);

const TLS_CODES = new Set([
  "CERT_HAS_EXPIRED",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "CERT_UNTRUSTED",
  "ERR_SSL_WRONG_VERSION_NUMBER",
  "ERR_SSL_PACKET_LENGTH_TOO_LONG",
]);

const TIMEOUT_CODES = new Set(["UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "ETIMEDOUT"]);

const CONNECTION_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "EPIPE",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT",
]);

interface ErrorLike {
  code?: unknown;
  message?: unknown;
  name?: unknown;
  cause?: unknown;
}

/** Walk the `cause` chain collecting every `code` we can find. */
function collectCodes(error: unknown): string[] {
  const codes: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (typeof current === "object" && current !== null) {
      const e = current as ErrorLike;
      if (typeof e.code === "string") codes.push(e.code);
      current = e.cause;
    } else {
      break;
    }
  }
  return codes;
}

function collectMessages(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (typeof current === "object" && current !== null) {
      const e = current as ErrorLike;
      if (typeof e.message === "string") parts.push(e.message);
      current = e.cause;
    } else if (typeof current === "string") {
      parts.push(current);
      break;
    } else {
      break;
    }
  }
  return parts.join(" | ");
}

export interface Classification {
  kind: ErrorKind;
  message: string;
}

/**
 * Classify a thrown fetch error into a machine-readable kind plus a short
 * human-readable message. This is pure and unit-testable.
 */
export function classifyError(error: unknown): Classification {
  if (error instanceof Error && error.name === "AbortError") {
    return { kind: "timeout", message: "Превышен таймаут" };
  }

  const codes = collectCodes(error);
  const message = collectMessages(error) || "Неизвестная ошибка";

  for (const code of codes) {
    if (TIMEOUT_CODES.has(code)) return { kind: "timeout", message: "Превышен таймаут ожидания ответа" };
    if (DNS_CODES.has(code)) return { kind: "dns", message: "Сервер DNS не смог найти адрес хоста" };
    if (TLS_CODES.has(code)) return { kind: "ssl", message: "Ошибка проверки SSL-сертификата (истек срок или самоподписан)" };
    if (CONNECTION_CODES.has(code)) return { kind: "connection", message: "Соединение было сброшено или отклонено сервером" };
  }

  // Fall back to message sniffing for wrapped errors without errno codes.
  const lower = message.toLowerCase();
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return { kind: "timeout", message: "Превышен таймаут" };
  }
  if (
    lower.includes("getaddrinfo") ||
    lower.includes("enotfound") ||
    lower.includes("dns") ||
    lower.includes("name not resolved")
  ) {
    return { kind: "dns", message: "Ошибка DNS" };
  }
  if (
    lower.includes("certificate") ||
    lower.includes("ssl") ||
    lower.includes("tls") ||
    lower.includes("self-signed")
  ) {
    return { kind: "ssl", message: "Ошибка SSL/TLS" };
  }
  if (lower.includes("redirect")) {
    return { kind: "redirect", message: "Ошибка редиректа" };
  }

  return { kind: "unknown", message };
}

/**
 * Map an HTTP response to a status verdict.
 *
 * `2xx`/`3xx` → available. `451` (Unavailable For Legal Reasons) and `403`
 * are treated as blocked. `5xx` and other 4xx are reported as generic errors
 * with the real code preserved for the UI.
 */
export function classifyHttpStatus(status: number): CheckStatus {
  if (status >= 200 && status < 400) return "available";
  if (status === 451 || status === 403) return "blocked";
  return "error";
}

export function errorKindToStatus(kind: ErrorKind): CheckStatus {
  switch (kind) {
    case "timeout":
      return "timeout";
    case "dns":
      return "dns_error";
    case "ssl":
      return "ssl_error";
    default:
      return "error";
  }
}