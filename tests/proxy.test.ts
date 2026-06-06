import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * M2 regression guard: middleware must FAIL CLOSED.
 *
 * When the Supabase env is missing the middleware cannot verify a session.
 * The previous behavior returned NextResponse.next() for every path, so a
 * misconfigured deploy silently served protected pages to everyone. Fail
 * closed: protected paths redirect to /login; public paths (notably /login
 * itself) still pass through so there is no redirect loop.
 *
 * Second guard: even with env present, `getUser()` can throw (Supabase
 * unreachable, malformed token). An unhandled throw turns a protected route
 * into a 500 instead of a clean fail-closed redirect. The middleware must
 * catch it and apply the same fail-closed logic the layout already does.
 */

const URL_KEY = "NEXT_PUBLIC_SUPABASE_URL";
const KEY_KEY = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

const getUserMock = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: getUserMock },
  }),
}));

const { proxy } = await import("../src/proxy");

describe("middleware fail-closed when Supabase env is missing", () => {
  let savedUrl: string | undefined;
  let savedKey: string | undefined;

  beforeEach(() => {
    savedUrl = process.env[URL_KEY];
    savedKey = process.env[KEY_KEY];
    delete process.env[URL_KEY];
    delete process.env[KEY_KEY];
  });

  afterEach(() => {
    if (savedUrl === undefined) delete process.env[URL_KEY];
    else process.env[URL_KEY] = savedUrl;
    if (savedKey === undefined) delete process.env[KEY_KEY];
    else process.env[KEY_KEY] = savedKey;
  });

  it("redirects a protected path to /login", async () => {
    const res = await proxy(
      new NextRequest("https://app.example.com/dashboard")
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://app.example.com/login");
  });

  it("lets the /login public path through (no redirect loop)", async () => {
    const res = await proxy(
      new NextRequest("https://app.example.com/login")
    );
    // next() carries no redirect Location header.
    expect(res.headers.get("location")).toBeNull();
  });

  it("lets the auth callback path through", async () => {
    const res = await proxy(
      new NextRequest("https://app.example.com/api/auth/callback?code=x")
    );
    expect(res.headers.get("location")).toBeNull();
  });
});

describe("middleware fail-closed when getUser throws", () => {
  let savedUrl: string | undefined;
  let savedKey: string | undefined;

  beforeEach(() => {
    savedUrl = process.env[URL_KEY];
    savedKey = process.env[KEY_KEY];
    process.env[URL_KEY] = "https://project.supabase.co";
    process.env[KEY_KEY] = "anon-key";
    getUserMock.mockReset();
    getUserMock.mockRejectedValue(new Error("supabase unreachable"));
  });

  afterEach(() => {
    if (savedUrl === undefined) delete process.env[URL_KEY];
    else process.env[URL_KEY] = savedUrl;
    if (savedKey === undefined) delete process.env[KEY_KEY];
    else process.env[KEY_KEY] = savedKey;
  });

  it("redirects a protected path to /login instead of throwing a 500", async () => {
    const res = await proxy(
      new NextRequest("https://app.example.com/dashboard")
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://app.example.com/login");
  });

  it("lets a public path through when getUser throws (no redirect loop)", async () => {
    const res = await proxy(
      new NextRequest("https://app.example.com/login")
    );
    expect(res.headers.get("location")).toBeNull();
  });
});

/**
 * S2 semantics guard: the public-path gate is (prefix /api/auth/*) OR (exact
 * match in publicPaths). This pins the two halves so a future refactor cannot
 * silently widen the prefix beyond /api/auth/* or narrow the exact-match list.
 *
 * Run under the missing-env branch, where isPublicPath alone decides
 * passthrough vs fail-closed redirect.
 */
describe("middleware public-path gate semantics (S2)", () => {
  let savedUrl: string | undefined;
  let savedKey: string | undefined;

  beforeEach(() => {
    savedUrl = process.env[URL_KEY];
    savedKey = process.env[KEY_KEY];
    delete process.env[URL_KEY];
    delete process.env[KEY_KEY];
  });

  afterEach(() => {
    if (savedUrl === undefined) delete process.env[URL_KEY];
    else process.env[URL_KEY] = savedUrl;
    if (savedKey === undefined) delete process.env[KEY_KEY];
    else process.env[KEY_KEY] = savedKey;
  });

  it("treats any /api/auth/* path as public via the prefix", async () => {
    const res = await proxy(
      new NextRequest("https://app.example.com/api/auth/signout")
    );
    expect(res.headers.get("location")).toBeNull();
  });

  it("gates a path that is neither under /api/auth/ nor an exact public entry", async () => {
    const res = await proxy(
      new NextRequest("https://app.example.com/settings")
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://app.example.com/login");
  });

  it("treats an exact publicPaths entry as public", async () => {
    const res = await proxy(
      new NextRequest("https://app.example.com/reset-password")
    );
    expect(res.headers.get("location")).toBeNull();
  });
});
