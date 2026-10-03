import { describe, expect, it } from "vitest";
import { parseTargetsCsv, parseTargetsJson } from "@/lib/export";

describe("parseTargetsJson", () => {
  it("parses a valid file", () => {
    const result = parseTargetsJson(
      JSON.stringify({ targets: [{ name: "GitHub", url: "https://github.com" }] }),
    );
    expect(result.fatal).toBeNull();
    expect(result.invalid).toBe(0);
    expect(result.targets).toHaveLength(1);
    expect(result.targets[0]).toMatchObject({ name: "GitHub", url: "https://github.com", category: "custom" });
  });

  it("rejects garbage rows instead of throwing (#wnc-import-crash)", () => {
    const result = parseTargetsJson(JSON.stringify({ targets: ["github.com", { name: "no-url" }] }));
    expect(result.targets).toHaveLength(0);
    expect(result.invalid).toBe(2);
  });

  it("reports a fatal error for non-JSON content", () => {
    expect(parseTargetsJson("not json{").fatal).not.toBeNull();
    expect(parseTargetsJson("{}").fatal).not.toBeNull();
  });
});

describe("parseTargetsCsv", () => {
  it("parses rows with a header", () => {
    const csv = "name,url,category,tags,pinned\nGitHub,https://github.com,custom,dev,true\n";
    const result = parseTargetsCsv(csv);
    expect(result.targets).toHaveLength(1);
    expect(result.targets[0]).toMatchObject({ name: "GitHub", pinned: true, tags: ["dev"] });
  });

  it("counts malformed rows instead of skipping silently", () => {
    const csv = "name,url\nonly-one-column\n,https://ok.example.com\n";
    const result = parseTargetsCsv(csv);
    expect(result.targets).toHaveLength(1);
    expect(result.invalid).toBe(1);
  });
});