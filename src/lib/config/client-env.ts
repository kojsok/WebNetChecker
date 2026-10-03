/**
 * Client-side limits mirrored from the server env (SCAN_MAX_TARGETS).
 * Override with NEXT_PUBLIC_SCAN_MAX_TARGETS so the UI matches the server cap;
 * the server always enforces its own value regardless.
 */
export const CLIENT_LIMITS = {
  maxTargets:
    Number(process.env.NEXT_PUBLIC_SCAN_MAX_TARGETS) > 0
      ? Number(process.env.NEXT_PUBLIC_SCAN_MAX_TARGETS)
      : 200,
} as const;
