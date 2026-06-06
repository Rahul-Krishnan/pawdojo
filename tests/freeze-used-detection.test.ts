import { describe, it, expect } from "vitest";
import { detectFreezeUsed } from "@/lib/gamification/streaks";

describe("detectFreezeUsed", () => {
  it("does not notify on first ever load (no stored marker)", () => {
    // A brand-new user (or a fresh browser) has no marker yet. Even if they
    // already have historical freeze_used events, we must not replay them.
    const result = detectFreezeUsed(3, null);
    expect(result.shouldNotify).toBe(false);
    expect(result.newlyConsumed).toBe(0);
    // The marker is seeded to the live total so future loads are quiet.
    expect(result.acknowledgedCount).toBe(3);
  });

  it("does not notify when the total is unchanged since last view", () => {
    const result = detectFreezeUsed(2, 2);
    expect(result.shouldNotify).toBe(false);
    expect(result.newlyConsumed).toBe(0);
    expect(result.acknowledgedCount).toBe(2);
  });

  it("notifies when one freeze was consumed since last view", () => {
    const result = detectFreezeUsed(3, 2);
    expect(result.shouldNotify).toBe(true);
    expect(result.newlyConsumed).toBe(1);
    expect(result.acknowledgedCount).toBe(3);
  });

  it("reports the number of freezes consumed when several happened", () => {
    const result = detectFreezeUsed(5, 2);
    expect(result.shouldNotify).toBe(true);
    expect(result.newlyConsumed).toBe(3);
    expect(result.acknowledgedCount).toBe(5);
  });

  it("notifies on the very first freeze when the marker was seeded at zero", () => {
    const result = detectFreezeUsed(1, 0);
    expect(result.shouldNotify).toBe(true);
    expect(result.newlyConsumed).toBe(1);
    expect(result.acknowledgedCount).toBe(1);
  });

  it("is idempotent: re-running with the advanced marker does not re-notify", () => {
    const first = detectFreezeUsed(3, 2);
    expect(first.shouldNotify).toBe(true);
    const second = detectFreezeUsed(3, first.acknowledgedCount);
    expect(second.shouldNotify).toBe(false);
    expect(second.newlyConsumed).toBe(0);
  });

  it("never goes negative if the stored marker is somehow ahead of the total", () => {
    // Defensive: e.g. events were deleted server-side, or a stale marker.
    const result = detectFreezeUsed(1, 4);
    expect(result.shouldNotify).toBe(false);
    expect(result.newlyConsumed).toBe(0);
    expect(result.acknowledgedCount).toBe(1);
  });

  it("treats a missing total as zero", () => {
    // A null/undefined count coerced to a non-finite number must not notify.
    expect(detectFreezeUsed(Number.NaN, 0).shouldNotify).toBe(false);
    expect(detectFreezeUsed(Number.NaN, 0).acknowledgedCount).toBe(0);
  });

  it("ignores a negative total", () => {
    const result = detectFreezeUsed(-5, 0);
    expect(result.shouldNotify).toBe(false);
    expect(result.acknowledgedCount).toBe(0);
  });

  it("floors fractional totals defensively", () => {
    const result = detectFreezeUsed(2.9, 1);
    expect(result.newlyConsumed).toBe(1);
    expect(result.acknowledgedCount).toBe(2);
  });

  it("treats a non-finite stored marker as a missing marker", () => {
    const result = detectFreezeUsed(3, Number.NaN);
    expect(result.shouldNotify).toBe(false);
    expect(result.acknowledgedCount).toBe(3);
  });
});
