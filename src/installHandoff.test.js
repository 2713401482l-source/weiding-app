import { describe, expect, it } from "vitest";
import { createInstallHandoff, mergeInstallHandoff, parseInstallHandoff } from "./installHandoff.js";

describe("private install data handoff", () => {
  it("round-trips Chinese records and known settings", () => {
    const text = createInstallHandoff({ records: [{ id: "one", note: "今天慢了一点" }], settings: { theme: "dark", recordsEnabled: true, unknown: "drop" }, exportedAt: 42 });
    const parsed = parseInstallHandoff(text);
    expect(parsed.exportedAt).toBe(42);
    expect(parsed.records[0].note).toBe("今天慢了一点");
    expect(parsed.settings).toEqual({ theme: "dark", recordsEnabled: true });
  });

  it("rejects malformed or unrelated clipboard text", () => {
    expect(parseInstallHandoff("hello")).toBeNull();
    expect(parseInstallHandoff("WEIDING_TRANSFER_V1:bad")) .toBeNull();
  });

  it("merges records without duplicates and preserves current-only settings", () => {
    const result = mergeInstallHandoff([{ id: "old", note: "current" }], { theme: "light", haptics: false }, {
      records: [{ id: "old", note: "restored" }, { id: "new" }], settings: { theme: "dark" },
    });
    expect(result.records).toHaveLength(2);
    expect(result.records[0].note).toBe("restored");
    expect(result.settings).toEqual({ theme: "dark", haptics: false });
  });
});
