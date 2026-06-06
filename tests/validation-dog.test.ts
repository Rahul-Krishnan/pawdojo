import { describe, it, expect } from "vitest";
import { validateDogInput } from "@/lib/validation/dog";

// Pure validation coverage for validateDogInput (RK-8 gap: lib/validation/dog.ts).
// This guard is shared by create-dog and update-profile's updateDog; pinning its
// branches here keeps the action tests focused on wiring rather than re-asserting
// every validation message.

describe("validateDogInput", () => {
  it("accepts a valid name with a breed", () => {
    expect(validateDogInput({ name: "Rex", breed: "Border Collie" })).toBeNull();
  });

  it("accepts a valid name with a null breed", () => {
    expect(validateDogInput({ name: "Rex", breed: null })).toBeNull();
  });

  it("rejects an empty name", () => {
    expect(validateDogInput({ name: "", breed: null })).toBe(
      "Dog name is required"
    );
  });

  it("rejects a whitespace-only name (trimmed to empty)", () => {
    expect(validateDogInput({ name: "   ", breed: null })).toBe(
      "Dog name is required"
    );
  });

  it("rejects a name longer than 50 characters", () => {
    expect(validateDogInput({ name: "a".repeat(51), breed: null })).toBe(
      "Dog name too long (max 50 characters)"
    );
  });

  it("accepts a name exactly at the 50-character boundary", () => {
    expect(validateDogInput({ name: "a".repeat(50), breed: null })).toBeNull();
  });

  it("rejects a breed longer than 100 characters", () => {
    expect(
      validateDogInput({ name: "Rex", breed: "b".repeat(101) })
    ).toBe("Breed name too long");
  });

  it("accepts a breed exactly at the 100-character boundary", () => {
    expect(
      validateDogInput({ name: "Rex", breed: "b".repeat(100) })
    ).toBeNull();
  });
});
