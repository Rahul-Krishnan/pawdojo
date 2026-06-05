import { describe, it, expect } from "vitest";
import { calculateLevel } from "@/lib/gamification/xp";

describe("smoke test", () => {
  it("runs", () => {
    expect(calculateLevel(400)).toBe(2);
  });
});
