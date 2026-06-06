import type { NextConfig } from "next";

// Derive the Supabase origin so connect-src can reach PostgREST/Auth over https
// and Realtime over wss. Falls back to a bare https/wss allowance when the env
// is absent (eg local tooling) so the report-only policy never hard-fails.
function supabaseConnectSrc(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "https: wss:";
  try {
    const { host } = new URL(url);
    return `https://${host} wss://${host}`;
  } catch {
    return "https: wss:";
  }
}

// Same-origin sink that collects the report-only violations (S4). Without a
// reporting destination the report-only policy computes violations and drops
// them, so the "observe, then enforce" rollout has nothing to observe.
const CSP_REPORT_GROUP = "csp-endpoint";
const CSP_REPORT_PATH = "/api/csp-report";

// Report-only CSP (M3): observe violations in production without blocking.
// 'unsafe-inline'/'unsafe-eval' are intentionally permitted for now because
// Next.js injects inline bootstrap scripts and styles; the next iteration
// switches to a nonce-based enforcing policy once the violation reports are
// reviewed. report-to (modern Reporting API) plus report-uri (legacy fallback)
// deliver violations to CSP_REPORT_PATH.
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseConnectSrc()}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  `report-uri ${CSP_REPORT_PATH}`,
  `report-to ${CSP_REPORT_GROUP}`,
].join("; ");

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
          {
            key: "Content-Security-Policy-Report-Only",
            value: cspReportOnly,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
