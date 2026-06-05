import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * L4 regression guard: the OAuth callback must build its post-login redirect
 * from a TRUSTED base, not from the request's own origin.
 *
 * `origin` is derived from the incoming request URL, which behind a proxy
 * reflects the (attacker-controllable) Host/X-Forwarded-Host header. An
 * attacker who can set that header could turn the post-auth redirect into an
 * open redirect to their own domain (phishing with a real session in flight).
 *
 * Fix: when NEXT_PUBLIC_SITE_URL is set, redirects use it as the base. The
 * relative-path allowlist on `next` is preserved. When the env is unset (local
 * dev) the route falls back to the request origin for convenience.
 */

const SITE_KEY = "NEXT_PUBLIC_SITE_URL";

const exchangeMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { exchangeCodeForSession: exchangeMock },
  }),
}));

const { GET } = await import("@/app/api/auth/callback/route");

describe("auth callback trusted redirect base (L4)", () => {
  let saved: string | undefined;

  beforeEach(() => {
    saved = process.env[SITE_KEY];
    exchangeMock.mockReset();
    exchangeMock.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    if (saved === undefined) delete process.env[SITE_KEY];
    else process.env[SITE_KEY] = saved;
  });

  it("uses NEXT_PUBLIC_SITE_URL as the redirect base, ignoring the request host", async () => {
    process.env[SITE_KEY] = "https://pawdojo.app";
    const res = await GET(
      new Request("https://attacker.example.com/api/auth/callback?code=abc")
    );
    expect(res.headers.get("location")).toBe("https://pawdojo.app/dashboard");
  });

  it("preserves the relative-path allowlist against the trusted base", async () => {
    process.env[SITE_KEY] = "https://pawdojo.app";
    const res = await GET(
      new Request(
        "https://attacker.example.com/api/auth/callback?code=abc&next=//evil.com"
      )
    );
    // Protocol-relative URLs are rejected, falling back to /dashboard.
    expect(res.headers.get("location")).toBe("https://pawdojo.app/dashboard");
  });

  it("rejects backslash-prefixed next paths that browsers normalize to protocol-relative", async () => {
    process.env[SITE_KEY] = "https://pawdojo.app";
    const res = await GET(
      new Request(
        "https://attacker.example.com/api/auth/callback?code=abc&next=/\\evil.com"
      )
    );
    // `/\evil.com` is treated as `//evil.com` by many browsers; reject it.
    expect(res.headers.get("location")).toBe("https://pawdojo.app/dashboard");
  });

  it("routes auth failures to the trusted base too", async () => {
    process.env[SITE_KEY] = "https://pawdojo.app";
    exchangeMock.mockResolvedValue({ error: { message: "bad code" } });
    const res = await GET(
      new Request("https://attacker.example.com/api/auth/callback?code=abc")
    );
    expect(res.headers.get("location")).toBe(
      "https://pawdojo.app/login?error=auth_failed"
    );
  });

  it("normalizes a path-bearing NEXT_PUBLIC_SITE_URL down to its origin", async () => {
    // A misconfigured env that carries a path (or query) must not bleed into
    // the redirect target. new URL(...).origin strips path/query/fragment;
    // a bare trailing-slash strip would leave "/foo" glued onto the redirect.
    process.env[SITE_KEY] = "https://pawdojo.app/foo";
    const res = await GET(
      new Request("https://attacker.example.com/api/auth/callback?code=abc")
    );
    expect(res.headers.get("location")).toBe("https://pawdojo.app/dashboard");
  });

  it("falls back to the request origin when NEXT_PUBLIC_SITE_URL is unset", async () => {
    delete process.env[SITE_KEY];
    const res = await GET(
      new Request("https://localhost:3000/api/auth/callback?code=abc&next=/progress")
    );
    expect(res.headers.get("location")).toBe("https://localhost:3000/progress");
  });
});
