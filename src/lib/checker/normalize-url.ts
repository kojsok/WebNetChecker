import { z } from "zod";

/**
 * Result of normalizing a user-supplied target string.
 * Returning a discriminated union keeps callers honest about error handling.
 */
export type NormalizeResult =
  | { ok: true; url: string; host: string }
  | { ok: false; reason: string };

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/** Maximum length we will accept for a single URL string. */
const MAX_URL_LENGTH = 2048;

/**
 * Hostname validation: labels of 1-63 chars, separated by dots, optional
 * trailing dot. Rejects spaces, control chars, and underscore-less garbage.
 */
const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.?$/i;

/** Zod schema used by the API layer for batches of raw strings. */
export const rawTargetSchema = z
  .string()
  .trim()
  .min(1, "Пустая цель")
  .max(MAX_URL_LENGTH, "Слишком длинный URL");

/**
 * Normalize a raw user string into an absolute http(s) URL.
 *
 * - Adds `https://` when no scheme is present.
 * - Rejects non-http(s) schemes (file:, ftp:, javascript:, data:, ...).
 * - Rejects credentials in the URL (user:pass@host).
 * - Validates the hostname shape.
 */
export function normalizeUrl(raw: string): NormalizeResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: "Пустая цель" };
  }
  if (trimmed.length > MAX_URL_LENGTH) {
    return { ok: false, reason: "URL слишком длинный" };
  }
  // Reject control characters outright.
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) {
    return { ok: false, reason: "URL содержит управляющие символы" };
  }

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return { ok: false, reason: "Некорректный URL" };
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return { ok: false, reason: `Недопустимый протокол: ${parsed.protocol}` };
  }
  if (parsed.username !== "" || parsed.password !== "") {
    return { ok: false, reason: "URL не должен содержать учётные данные" };
  }
  if (!HOSTNAME_RE.test(parsed.hostname)) {
    return { ok: false, reason: "Некорректное имя хоста" };
  }
  // Drop the fragment: it never affects the server response.
  parsed.hash = "";

  return { ok: true, url: parsed.toString(), host: parsed.hostname.toLowerCase() };
}

/** Convenience predicate used by the UI for inline validation. */
export function isValidTarget(raw: string): boolean {
  return normalizeUrl(raw).ok;
}