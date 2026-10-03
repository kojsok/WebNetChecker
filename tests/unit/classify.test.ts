import { describe, expect, it } from "vitest";
import { classifyError, classifyHttpStatus, errorKindToStatus } from "@/lib/checker/classify";

function errorWithCode(code: string, message = code): Error {
  const err = new Error(message);
  (err as Error & { code: string }).code = code;
  return err;
}

describe("classifyError", () => {
  it("classifies AbortError as timeout", () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    expect(classifyError(err).kind).toBe("timeout");
  });

  it("classifies DNS errno codes", () => {
    expect(classifyError(errorWithCode("ENOTFOUND")).kind).toBe("dns");
    expect(classifyError(errorWithCode("EAI_AGAIN")).kind).toBe("dns");
  });

  it("classifies TLS errno codes", () => {
    expect(classifyError(errorWithCode("CERT_HAS_EXPIRED")).kind).toBe("ssl");
    expect(classifyError(errorWithCode("DEPTH_ZERO_SELF_SIGNED_CERT")).kind).toBe("ssl");
  });

  it("classifies connection errno codes", () => {
    expect(classifyError(errorWithCode("ECONNREFUSED")).kind).toBe("connection");
    expect(classifyError(errorWithCode("ECONNRESET")).kind).toBe("connection");
  });

  it("classifies undici timeout codes", () => {
    expect(classifyError(errorWithCode("UND_ERR_CONNECT_TIMEOUT")).kind).toBe("timeout");
  });

  it("falls back to message sniffing for DNS", () => {
    expect(classifyError(new Error("getaddrinfo ENOTFOUND host")).kind).toBe("dns");
  });

  it("falls back to message sniffing for TLS", () => {
    expect(classifyError(new Error("self-signed certificate in chain")).kind).toBe("ssl");
  });

  it("returns unknown for unrecognised errors", () => {
    expect(classifyError(new Error("something odd")).kind).toBe("unknown");
  });

  it("walks the cause chain", () => {
    const root = errorWithCode("ENOTFOUND");
    const wrapper = new Error("fetch failed", { cause: root });
    expect(classifyError(wrapper).kind).toBe("dns");
  });
});

describe("classifyHttpStatus", () => {
  it("treats 2xx and 3xx as available", () => {
    expect(classifyHttpStatus(200)).toBe("available");
    expect(classifyHttpStatus(204)).toBe("available");
    expect(classifyHttpStatus(301)).toBe("available");
    expect(classifyHttpStatus(302)).toBe("available");
  });

  it("treats 403 and 451 as blocked", () => {
    expect(classifyHttpStatus(403)).toBe("blocked");
    expect(classifyHttpStatus(451)).toBe("blocked");
  });

  it("treats 4xx and 5xx as errors", () => {
    expect(classifyHttpStatus(404)).toBe("error");
    expect(classifyHttpStatus(500)).toBe("error");
    expect(classifyHttpStatus(503)).toBe("error");
  });
});

describe("errorKindToStatus", () => {
  it("maps error kinds to statuses", () => {
    expect(errorKindToStatus("timeout")).toBe("timeout");
    expect(errorKindToStatus("dns")).toBe("dns_error");
    expect(errorKindToStatus("ssl")).toBe("ssl_error");
    expect(errorKindToStatus("connection")).toBe("error");
    expect(errorKindToStatus("unknown")).toBe("error");
  });
});