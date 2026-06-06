import { describe, it, expect } from "vitest";
import { isValidTimeZone } from "@/lib/validation/timezone";

/**
 * B1 (write-side guard): updateTimezone() wrote a raw user-supplied timezone
 * string with no validation. xp-handler later passes that string to
 * toLocaleString({ timeZone }), and a malformed IANA name throws a RangeError
 * that breaks XP awarding for that user on every session log. Validating on
 * write keeps bad data out of the column in the first place.
 */
describe("isValidTimeZone (B1 write-side guard)", () => {
  it("accepts canonical IANA zones the runtime supports", () => {
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("America/Los_Angeles")).toBe(true);
  });

  it("rejects malformed zone strings that would throw RangeError downstream", () => {
    expect(isValidTimeZone("Not/AReal_Zone")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone("'; DROP TABLE user_profiles; --")).toBe(false);
  });
});
