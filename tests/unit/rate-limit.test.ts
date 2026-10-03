import { describe, expect, it } from "vitest";
import { createMemoryRateLimiter, getClientKey } from "@/lib/rate-limit";
import { safeEqual } from "@/lib/checker/scan-handler";

function request(headers: Record<string, string>): Request {
  return new Request("http://localhost:3000/api/scan", { headers });
}

describe("createMemoryRateLimiter", () => {
  it("allows up to the limit and then rejects", () => {
    const limiter = createMemoryRateLimiter(3, 60_000);
    expect(limiter.consume("a").allowed).toBe(true);
    expect(limiter.consume("a").allowed).toBe(true);
    expect(limiter.consume("a").allowed).toBe(true);
    const fourth = limiter.consume("a");
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
  });

  it("keys are isolated", () => {
    const limiter = createMemoryRateLimiter(1, 60_000);
    expect(limiter.consume("a").allowed).toBe(true);
    expect(limiter.consume("a").allowed).toBe(false);
    expect(limiter.consume("b").allowed).toBe(true);
  });

  it("resets after the window", () => {
    const limiter = createMemoryRateLimiter(1, 10);
    expect(limiter.consume("a").allowed).toBe(true);
    expect(limiter.consume("a").allowed).toBe(false);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(limiter.consume("a").allowed).toBe(true);
        resolve();
      }, 15);
    });
  });
});

describe("getClientKey", () => {
  it("without trustProxy uses the first xff entry (untrusted is still isolating)", () => {
    const req = request({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" });
    expect(getClientKey(req, { trustProxy: false })).toBe("1.2.3.4");
  });

  it("with trustProxy uses the last xff entry — the proxy-appended real IP", () => {
    const req = request({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" });
    expect(getClientKey(req, { trustProxy: true })).toBe("10.0.0.1");
  });

  it("spoofed xff without a proxy falls back to unknown", () => {
    expect(getClientKey(request({}), { trustProxy: false })).toBe("unknown");
    expect(getClientKey(request({ "x-forwarded-for": "" }), { trustProxy: true })).toBe("unknown");
  });

  it("with trustProxy falls back to x-real-ip", () => {
    const req = request({ "x-real-ip": "8.8.8.8" });
    expect(getClientKey(req, { trustProxy: true })).toBe("8.8.8.8");
  });

  it("x-real-ip is ignored when proxy is untrusted", () => {
    const req = request({ "x-real-ip": "8.8.8.8" });
    expect(getClientKey(req, { trustProxy: false })).toBe("unknown");
  });
});

describe("safeEqual", () => {
  it("matches equal strings", () => {
    expect(safeEqual("secret-key", "secret-key")).toBe(true);
  });

  it("rejects different strings", () => {
    expect(safeEqual("secret-key", "wrong-key")).toBe(false);
  });

  it("rejects different lengths (no length-based bypass)", () => {
    expect(safeEqual("secret", "secret-key")).toBe(false);
    expect(safeEqual("", "secret-key")).toBe(false);
    expect(safeEqual("secret-key", "")).toBe(false);
  });
});