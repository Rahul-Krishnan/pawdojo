// B1 (write-side guard): a raw user-supplied timezone string is later passed to
// toLocaleString/toLocaleDateString in xp-handler.ts. A malformed IANA name
// throws a RangeError there, breaking XP awarding for that user on every session
// log. The runtime is the source of truth for which zones it supports, so we
// validate by constructing a formatter and treating any throw (or an empty
// string the formatter would silently accept) as invalid.
export function isValidTimeZone(tz: string): boolean {
  if (!tz) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
