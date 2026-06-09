import type { NextConfig } from "next";

// Static security headers live here; the Content-Security-Policy itself is
// minted per request in src/proxy.ts because the enforcing policy embeds a
// fresh script nonce, and a build-time header cannot carry per-request
// entropy. This file intentionally emits NO CSP header (neither enforcing nor
// report-only): a stale static copy alongside the proxy's policy would mean
// two policies with the browser enforcing the intersection, turning a config
// drift into a hard-to-debug breakage.
//
// Reporting-Endpoints stays here because it IS static. It declares the group
// that the proxy's report-to directive resolves against; keep
// CSP_REPORT_GROUP in sync with src/proxy.ts or Reporting-API deliveries
// silently stop (the report-uri fallback in the proxy still works).
const CSP_REPORT_GROUP = "csp-endpoint";
const CSP_REPORT_PATH = "/api/csp-report";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Reporting-Endpoints",
            value: `${CSP_REPORT_GROUP}="${CSP_REPORT_PATH}"`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
