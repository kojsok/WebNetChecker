import { avatarPaletteFor, resolveBrandLogo } from "@/lib/brand-logo";
import { cn } from "@/lib/cn";

interface Props {
  /** Target host (lowercase hostname of the checked URL). */
  host: string;
  /** Display name — source of the fallback avatar letter. */
  name: string;
  /** Rendered size in px (square). */
  size?: number;
  className?: string;
  /**
   * Hide from assistive tech: use when the target name is already rendered
   * next to the logo (service lists, buttons) — otherwise screen readers
   * announce the name twice and the button's accessible name duplicates.
   */
  decorative?: boolean;
}

/**
 * Brand logo for a target: inline SVG in the brand color (dark hexes guarded
 * to silver) or a deterministic letter avatar when the brand is unknown.
 */
export function BrandLogo({ host, name, size = 28, className, decorative }: Props) {
  const resolved = resolveBrandLogo(host, name);

  if (resolved.kind === "brand") {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : resolved.title}
        aria-hidden={decorative || undefined}
        className={cn("shrink-0", className)}
      >
        <path d={resolved.path} fill={resolved.colorHex} />
      </svg>
    );
  }

  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.5)) }}
      className={cn(
        "border-steel font-display inline-flex shrink-0 items-center justify-center border leading-none",
        avatarPaletteFor(resolved.seed),
        className,
      )}
    >
      {resolved.letter}
    </span>
  );
}
