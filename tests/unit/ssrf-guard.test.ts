import { describe, expect, it } from "vitest";
import { assertUrlAllowed, isBlockedIp, SsrfError } from "@/lib/checker/ssrf-guard";

describe("isBlockedIp", () => {
  it("blocks loopback addresses", () => {
    expect(isBlockedIp("127.0.0.1")).toBe(true);
    expect(isBlockedIp("127.255.255.254")).toBe(true);
  });

  it("blocks private IPv4 ranges", () => {
    expect(isBlockedIp("10.0.0.1")).toBe(true);
    expect(isBlockedIp("172.16.5.4")).toBe(true);
    expect(isBlockedIp("192.168.1.1")).toBe(true);
  });

  it("blocks the cloud metadata endpoint", () => {
    expect(isBlockedIp("169.254.169.254")).toBe(true);
  });

  it("blocks link-local and CGNAT", () => {
    expect(isBlockedIp("169.254.0.1")).toBe(true);
    expect(isBlockedIp("100.64.0.1")).toBe(true);
  });

  it("blocks IPv6 loopback and unique-local", () => {
    expect(isBlockedIp("::1")).toBe(true);
    expect(isBlockedIp("fd00::1")).toBe(true);
    expect(isBlockedIp("fe80::1")).toBe(true);
  });

  it("blocks IPv4-mapped private addresses", () => {
    expect(isBlockedIp("::ffff:192.168.0.1")).toBe(true);
    expect(isBlockedIp("::ffff:127.0.0.1")).toBe(true);
  });

  it("allows public IPv4 addresses", () => {
    expect(isBlockedIp("8.8.8.8")).toBe(false);
    expect(isBlockedIp("1.1.1.1")).toBe(false);
    expect(isBlockedIp("140.82.121.4")).toBe(false);
  });

  it("allows public IPv6 addresses", () => {
    expect(isBlockedIp("2606:4700:4700::1111")).toBe(false);
  });

  it("fails closed on unparseable input", () => {
    expect(isBlockedIp("not-an-ip")).toBe(true);
  });
});

describe("assertUrlAllowed", () => {
  it("allows a normal https URL", () => {
    expect(() => assertUrlAllowed(new URL("https://github.com"))).not.toThrow();
  });

  it("rejects localhost by name", () => {
    expect(() => assertUrlAllowed(new URL("http://localhost:3000"))).toThrow(SsrfError);
  });

  it("rejects a literal loopback IP", () => {
    expect(() => assertUrlAllowed(new URL("http://127.0.0.1"))).toThrow(SsrfError);
  });

  it("rejects the metadata IP", () => {
    expect(() => assertUrlAllowed(new URL("http://169.254.169.254/latest/meta-data"))).toThrow(
      SsrfError,
    );
  });

  it("rejects a non-http scheme", () => {
    expect(() => assertUrlAllowed(new URL("ftp://example.com"))).toThrow(SsrfError);
  });
});