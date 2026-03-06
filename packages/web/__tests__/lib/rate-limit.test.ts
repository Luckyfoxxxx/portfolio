import { describe, expect, it, beforeEach, vi } from "vitest";
import { checkRateLimit, resetRateLimit } from "../../lib/auth/rate-limit.js";

// Reset module state between tests by re-importing with cache busting
// Instead we reset via exported function
beforeEach(() => {
  resetRateLimit("test-ip");
  resetRateLimit("other-ip");
});

describe("checkRateLimit", () => {
  it("allows first attempt", () => {
    const result = checkRateLimit("test-ip");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("allows up to 5 attempts", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("test-ip").allowed).toBe(true);
    }
  });

  it("blocks 6th attempt", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("test-ip");
    }
    const result = checkRateLimit("test-ip");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("each IP has independent bucket", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("test-ip");
    }
    const result = checkRateLimit("other-ip");
    expect(result.allowed).toBe(true);
  });

  it("resetRateLimit clears the bucket", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("test-ip");
    }
    expect(checkRateLimit("test-ip").allowed).toBe(false);

    resetRateLimit("test-ip");
    expect(checkRateLimit("test-ip").allowed).toBe(true);
  });

  it("returns resetAt timestamp in the future", () => {
    const before = Date.now();
    const result = checkRateLimit("test-ip");
    expect(result.resetAt).toBeGreaterThan(before);
  });

  it("resets after window expires", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 5; i++) {
      checkRateLimit("test-ip");
    }
    expect(checkRateLimit("test-ip").allowed).toBe(false);

    // Advance time past the 15-minute window
    vi.advanceTimersByTime(16 * 60 * 1000);

    expect(checkRateLimit("test-ip").allowed).toBe(true);
    vi.useRealTimers();
  });
});
