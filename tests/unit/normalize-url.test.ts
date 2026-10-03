import { describe, expect, it } from "vitest";
import { isValidTarget, normalizeUrl } from "@/lib/checker/normalize-url";

describe("normalizeUrl", () => {
  it("adds https:// when no scheme is present", () => {
    const result = normalizeUrl("github.com");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url).toBe("https://github.com/");
      expect(result.host).toBe("github.com");
    }
  });

  it("keeps an explicit http scheme", () => {
    const result = normalizeUrl("http://example.com/path");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.url.startsWith("http://")).toBe(true);
  });

  it("strips the fragment", () => {
    const result = normalizeUrl("https://example.com/page#section");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.url).not.toContain("#");
  });

  it("lowercases the host", () => {
    const result = normalizeUrl("https://GitHub.COM");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.host).toBe("github.com");
  });

  it("trims surrounding whitespace", () => {
    const result = normalizeUrl("  example.com  ");
    expect(result.ok).toBe(true);
  });

  it("rejects empty input", () => {
    expect(normalizeUrl("   ").ok).toBe(false);
  });

  it("rejects non-http(s) schemes", () => {
    expect(normalizeUrl("file:///etc/passwd").ok).toBe(false);
    expect(normalizeUrl("ftp://example.com").ok).toBe(false);
    expect(normalizeUrl("javascript:alert(1)").ok).toBe(false);
    expect(normalizeUrl("data:text/html,<h1>x</h1>").ok).toBe(false);
  });

  it("rejects credentials embedded in the URL", () => {
    expect(normalizeUrl("https://user:pass@example.com").ok).toBe(false);
  });

  it("rejects control characters", () => {
    expect(normalizeUrl("example.com/\u0000path").ok).toBe(false);
  });

  it("rejects an overly long URL", () => {
    const long = `https://example.com/${"a".repeat(3000)}`;
    expect(normalizeUrl(long).ok).toBe(false);
  });

  it("rejects malformed hostnames", () => {
    expect(normalizeUrl("https://exa mple.com").ok).toBe(false);
  });

  it("accepts subdomains and hyphens", () => {
    expect(normalizeUrl("api.telegram.org").ok).toBe(true);
    expect(normalizeUrl("registry-1.docker.io").ok).toBe(true);
  });
});

describe("isValidTarget", () => {
  it("returns true for a normal domain", () => {
    expect(isValidTarget("google.com")).toBe(true);
  });

  it("returns false for junk", () => {
    expect(isValidTarget("not a url at all")).toBe(false);
  });
});