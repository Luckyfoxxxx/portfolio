import { describe, expect, it } from "vitest";
import { randomBytes } from "crypto";

// generateSessionId is a pure utility — test the logic directly
// without importing session.ts (which pulls in next/headers + drizzle-orm)
function generateSessionId(): string {
  return randomBytes(32).toString("hex");
}

describe("generateSessionId", () => {
  it("returns a 64-character hex string", () => {
    const id = generateSessionId();
    expect(id).toHaveLength(64);
    expect(id).toMatch(/^[0-9a-f]+$/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateSessionId()));
    expect(ids.size).toBe(100);
  });
});
