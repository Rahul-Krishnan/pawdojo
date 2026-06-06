import { vi, describe, it, expect } from "vitest";
import nextConfig from "../next.config";

/**
 * S4 regression guard: report-only CSP must actually collect telemetry.
 *
 * The policy was sent as Content-Security-Policy-Report-Only with no report-to
 * or report-uri directive and no Reporting-Endpoints header, so violations were
 * computed and then dropped. The "observe, then enforce" rollout can only work
 * if reports are delivered somewhere. This wires a same-origin reporting
 * endpoint (/api/csp-report) via the Reporting-Endpoints header plus a report-to
 * directive (and a report-uri fallback for older browsers), while keeping the
 * policy in report-only mode.
 */

describe("CSP reporting endpoint wiring (S4)", () => {
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

  it("adds a report-to directive to the report-only policy", async () => {
    const groups = await nextConfig.headers!();
    const group = groups.find((g) => g.source === "/(.*)");
    const csp = group!.headers.find(
      (h) => h.key === "Content-Security-Policy-Report-Only"
    );
    expect(csp, "report-only CSP must still be present").toBeTruthy();
    expect(csp!.value).toContain("report-to");
  });

  it("keeps the policy in report-only mode (no enforcing CSP header)", async () => {
    const groups = await nextConfig.headers!();
    const group = groups.find((g) => g.source === "/(.*)");
    const enforcing = group!.headers.find(
      (h) => h.key === "Content-Security-Policy"
    );
    expect(enforcing, "must not flip to enforcing in this change").toBeFalsy();
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
