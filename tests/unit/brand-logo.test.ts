import { describe, expect, it } from "vitest";
import {
  avatarPaletteFor,
  hexRelativeLuminance,
  hostFromUrl,
  resolveBrandLogo,
} from "@/lib/brand-logo";

describe("hexRelativeLuminance", () => {
  it("black is 0, white is 1", () => {
    expect(hexRelativeLuminance("000000")).toBe(0);
    expect(hexRelativeLuminance("FFFFFF")).toBeCloseTo(1);
  });

  it("telegram blue is visible on void (above the dark threshold)", () => {
    expect(hexRelativeLuminance("26A5E4")).toBeGreaterThan(0.1);
  });

  it("github near-black is below the dark threshold", () => {
    expect(hexRelativeLuminance("181717")).toBeLessThan(0.1);
  });
});

describe("resolveBrandLogo", () => {
  it("resolves a covered brand and guards dark-on-dark", () => {
    const resolved = resolveBrandLogo("github.com", "GitHub");
    expect(resolved.kind).toBe("brand");
    if (resolved.kind === "brand") {
      expect(resolved.title).toBe("GitHub");
      // #181717 is invisible on the void background → silver guard.
      expect(resolved.colorHex).toBe("#C0C0C0");
    }
  });

  it("keeps visible brand colors", () => {
    const resolved = resolveBrandLogo("api.telegram.org", "Telegram");
    expect(resolved.kind).toBe("brand");
    if (resolved.kind === "brand") {
      expect(resolved.title).toBe("Telegram");
      expect(resolved.colorHex).toBe("#26A5E4");
    }
  });

  it("falls back to a letter avatar for unknown hosts", () => {
    const resolved = resolveBrandLogo("my-host.example.org", "My Service");
    expect(resolved.kind).toBe("avatar");
    if (resolved.kind === "avatar") {
      expect(resolved.letter).toBe("M");
      expect(resolved.seed).toBe("my-host.example.org");
    }
  });
});

describe("hostFromUrl", () => {
  it("extracts the lowercased hostname", () => {
    expect(hostFromUrl("https://GitHub.COM/path?q=1")).toBe("github.com");
  });

  it("falls back to the raw string for invalid URLs", () => {
    expect(hostFromUrl("not a url")).toBe("not a url");
  });
});

describe("avatarPaletteFor", () => {
  it("is deterministic per seed", () => {
    expect(avatarPaletteFor("github.com")).toBe(avatarPaletteFor("github.com"));
  });

  it("differs across distinct seeds", () => {
    expect(avatarPaletteFor("a")).not.toBe(avatarPaletteFor("b"));
  });
});
