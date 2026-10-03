/**
 * Shared domain types for the checker core.
 *
 * A `CheckStatus` is the terminal verdict for a single target. The UI maps
 * each status to a colour and badge; the bash-inspired terminal view maps it
 * to an emoji + label.
 */
export type CheckStatus =
  | "available"
  | "blocked"
  | "timeout"
  | "dns_error"
  | "ssl_error"
  | "error"
  | "pending";

/** Classification of why a check failed, derived from the thrown error. */
export type ErrorKind = "timeout" | "dns" | "ssl" | "connection" | "redirect" | "unknown";

export interface CheckResult {
  /** Stable id of the target within a scan (usually the normalized URL). */
  id: string;
  /** Human-readable label (service name or user-provided name). */
  name: string;
  /** Category id, or "custom" for user-added targets. */
  category: string;
  /** Normalized absolute URL that was actually requested. */
  url: string;
  /** Hostname extracted from the URL (for compact display). */
  host: string;
  status: CheckStatus;
  /** HTTP status code, or null when the request never completed. */
  httpStatus: number | null;
  /** Round-trip time in milliseconds, or null when the request never completed. */
  latencyMs: number | null;
  /** Machine-readable error kind when status is not "available". */
  errorKind: ErrorKind | null;
  /** Human-readable error message when status is not "available". */
  errorMessage: string | null;
  /** The 'Server' header value, if available. Helps detect captive portals. */
  serverHeader: string | null;
  /** ISO timestamp of when the check finished. */
  checkedAt: string;
}

export interface CheckOptions {
  /** Per-request timeout in milliseconds. */
  timeoutMs: number;
  /** Number of retries on timeout. */
  retries: number;
  /** Optional external abort signal. */
  signal?: AbortSignal;
}

/** A single target to check. */
export interface Target {
  id: string;
  name: string;
  url: string;
  category: string;
  tags: string[];
  pinned: boolean;
}

export interface Category {
  id: string;
  label: string;
  /** Lucide icon name, resolved in the UI layer. */
  icon: string;
}