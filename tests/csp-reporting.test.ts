import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import nextConfig from "../next.config";

/**
 * CSP enforcement guards (M3 flip, follows the S4 reporting wiring).
 *
 * The rollout went report-only first (observe violations via
 * /api/csp-report), then flipped to an enforcing nonce-based policy. The
 * enforcing policy is minted per request in src/proxy.ts because script-src
 * carries a fresh nonce; next.config.ts keeps only the static headers. These
 * tests pin both halves of that split:
 *
 * - next.config.ts must emit NO CSP header of either kind. A stale static
 *   policy alongside the proxy's would make the browser enforce the
 *   intersection of two policies, turning config drift into breakage.
 * - The proxy's policy must be nonce-based with 'strict-dynamic' and must
 *   keep delivering violations to the same sink (report-to + report-uri), so
 *   enforcement regressions stay observable.
 */

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  }),
}));

const { proxy } = await import("../src/proxy");

describe("static security headers (next.config.ts)", () => {
  it("emits a Reporting-Endpoints header pointing at the report sink", async () => {
    const groups = await nextConfig.headers!();
    const group = groups.find((g) => g.source === "/(.*)");
    expect(group, "global header group must exist").toBeTruthy();

    const reporting = group!.headers.find(
      (h) => h.key === "Reporting-Endpoints"
    );
    expect(reporting, "Reporting-Endpoints header must be present").toBeTruthy();
    expect(reporting!.value).toContain("/api/csp-report");
  });

  it("emits no static CSP header (the enforcing policy comes from the proxy)", async () => {
    const groups = await nextConfig.headers!();
    const group = groups.find((g) => g.source === "/(.*)");
    const staticCsp = group!.headers.find(
      (h) =>
        h.key === "Content-Security-Policy" ||
        h.key === "Content-Security-Policy-Report-Only"
    );
    expect(
      staticCsp,
      "static CSP would conflict with the per-request policy in src/proxy.ts"
    ).toBeFalsy();
  });
});

describe("enforcing CSP minted per request (src/proxy.ts)", () => {
  let savedUrl: string | undefined;
  let savedKey: string | undefined;

  beforeEach(() => {
    savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    savedKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  afterEach(() => {
    if (savedUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl;
    if (savedKey === undefined)
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = savedKey;
  });

  it("sets an enforcing nonce-based policy on the response", async () => {
    const res = await proxy(new NextRequest("https://app.example.com/login"));
    const csp = res.headers.get("content-security-policy");
    expect(csp, "enforcing CSP header must be present").toBeTruthy();
    // NODE_ENV is not "development" under vitest, so the production shape
    // (nonce + strict-dynamic, no unsafe-inline/unsafe-eval in script-src)
    // is what gets pinned here.
    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(res.headers.get("content-security-policy-report-only")).toBeNull();
  });

  it("keeps violation reporting wired to the sink", async () => {
    const res = await proxy(new NextRequest("https://app.example.com/login"));
    const csp = res.headers.get("content-security-policy")!;
    expect(csp).toContain("report-uri /api/csp-report");
    expect(csp).toContain("report-to csp-endpoint");
  });

  it("mints a fresh nonce per request (no replayable allowlist entry)", async () => {
    const first = await proxy(new NextRequest("https://app.example.com/login"));
    const second = await proxy(
      new NextRequest("https://app.example.com/login")
    );
    const nonceOf = (res: Response) =>
      res.headers.get("content-security-policy")!.match(/'nonce-([^']+)'/)![1];
    expect(nonceOf(first)).not.toBe(nonceOf(second));
  });

  it("forwards the nonce on the request headers so Next.js can stamp inline scripts", async () => {
    const res = await proxy(new NextRequest("https://app.example.com/login"));
    // NextResponse.next({ request }) surfaces forwarded request headers as
    // x-middleware-request-* on the proxy response; without x-nonce there,
    // the rendered document's bootstrap scripts carry no nonce and the
    // enforcing policy blocks the app's own hydration.
    const forwardedNonce = res.headers.get("x-middleware-request-x-nonce");
    expect(forwardedNonce, "x-nonce must reach the render").toBeTruthy();
    const csp = res.headers.get("content-security-policy")!;
    expect(csp).toContain(`'nonce-${forwardedNonce}'`);
  });

  it("stamps the policy on redirect responses too", async () => {
    const res = await proxy(
      new NextRequest("https://app.example.com/dashboard")
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("content-security-policy")).toContain(
      "'strict-dynamic'"
    );
  });
});

describe("CSP report sink route (S4)", () => {
  it("accepts a violation report and returns 204", async () => {
    const { POST } = await import("@/app/api/csp-report/route");
    const res = await POST(
      new Request("https://pawdojo.app/api/csp-report", {
        method: "POST",
        body: JSON.stringify({ "csp-report": { "document-uri": "/" } }),
        headers: { "content-type": "application/csp-report" },
      })
    );
    expect(res.status).toBe(204);
  });

  it("acks even when the body is empty or unparseable", async () => {
    const { POST } = await import("@/app/api/csp-report/route");
    const res = await POST(
      new Request("https://pawdojo.app/api/csp-report", { method: "POST" })
    );
    expect(res.status).toBe(204);
  });

  /**
   * S2: the sink parses request.json() with no body-size cap. An
   * unauthenticated POST can stream an arbitrarily large body that gets
   * fully buffered, parsed, and re-stringified into the logs. The handler
   * must reject oversized bodies before parsing them, while still acking
   * with 204 so the browser does not retry.
   */
  it("skips oversized bodies without parsing but still returns 204 (S2)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const huge = JSON.stringify({ "csp-report": { blob: "x".repeat(200_000) } });
    const { POST } = await import("@/app/api/csp-report/route");
    const res = await POST(
      new Request("https://pawdojo.app/api/csp-report", {
        method: "POST",
        body: huge,
        headers: { "content-type": "application/csp-report" },
      })
    );
    expect(res.status).toBe(204);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
