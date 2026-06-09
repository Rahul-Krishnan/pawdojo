import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/", "/login", "/api/auth/callback", "/reset-password"];

// Must stay in sync with the Reporting-Endpoints header emitted from
// next.config.ts: report-to resolves this group name against that header, so
// a drift between the two silently stops Reporting-API deliveries (the
// report-uri fallback below would still work).
const CSP_REPORT_GROUP = "csp-endpoint";
const CSP_REPORT_PATH = "/api/csp-report";

// Derive the Supabase origin so connect-src can reach PostgREST/Auth over https
// and Realtime over wss. Falls back to a bare https/wss allowance when the env
// is absent (eg local tooling) so the enforcing policy never hard-fails the
// app's own API calls.
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

// Enforcing CSP (M3), built per request so script-src can carry a fresh nonce.
// This is the flip from the report-only rollout: the report-only policy lived
// in next.config.ts, but a static header cannot carry per-request entropy, so
// the enforcing policy moves here.
//
// Threat model behind the shape:
// - script-src 'nonce-…' 'strict-dynamic': only scripts Next.js stamped with
//   this request's nonce execute, and scripts THEY load (chunk loading, lazy
//   imports) are trusted transitively. Markup injected via XSS carries no
//   nonce, so it cannot execute — this is the primitive the whole policy
//   exists to kill. 'self' stays as a fallback for older browsers that do not
//   understand 'strict-dynamic' (which makes newer browsers ignore it).
// - style-src keeps 'unsafe-inline': Next.js and the motion animation library
//   inject inline style attributes/elements at runtime, and styles cannot be
//   nonced the way scripts are here. Style injection is a far lower-severity
//   primitive than script injection (no code execution; worst case is UI
//   spoofing or slow CSS-selector exfiltration), so this trade is acceptable
//   where 'unsafe-inline' in script-src would not be.
// - fonts.googleapis.com / fonts.gstatic.com: the root layout links the hosted
//   Google Fonts stylesheet, which in turn loads font files from gstatic.
//   Without these allowances the enforcing flip would break typography
//   site-wide on day one.
// - Development drops the nonce and 'strict-dynamic' entirely and allows
//   'unsafe-inline'/'unsafe-eval' instead: Next dev tooling (HMR,
//   react-refresh, eval'd source maps) requires both, and browsers ignore
//   'unsafe-inline' whenever a nonce is present, so mixing them would break
//   dev rather than loosen it.
// - Violations keep flowing to the same sink as the report-only phase:
//   report-to (modern Reporting API) plus report-uri (legacy fallback) deliver
//   to CSP_REPORT_PATH, so enforcement regressions surface in the logs.
function buildContentSecurityPolicy(nonce: string): string {
  const scriptSrc =
    process.env.NODE_ENV === "development"
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' ${supabaseConnectSrc()}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `report-uri ${CSP_REPORT_PATH}`,
    `report-to ${CSP_REPORT_GROUP}`,
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  // The nonce travels two ways: on the REQUEST headers so Next.js reads it
  // (x-nonce plus the content-security-policy request header) and stamps it
  // onto the inline scripts it injects during rendering, and on the RESPONSE
  // so the browser enforces it. We mutate request.headers in place rather
  // than using the cloned-Headers pattern from the Next.js CSP docs because
  // the Supabase cookie write-back below re-issues NextResponse.next({
  // request }) — a cloned Headers object would be discarded by that re-issue
  // and the rendered page would lose its nonce.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);
  request.headers.set("x-nonce", nonce);
  request.headers.set("content-security-policy", contentSecurityPolicy);

  const response = await handleSession(request);

  // Redirect responses get the header too: it is inert there (no document is
  // rendered), and unconditionally stamping every response is harder to get
  // wrong than special-casing the render path.
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

async function handleSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  // Public if it is under the auth-callback prefix OR an exact public entry.
  // The prefix check belongs outside the per-entry loop: folding it into
  // publicPaths.some() ignored the iterator arg and made the prefix match on
  // every iteration, muddying intent and risking a silent gate bypass for any
  // future authed /api/auth/* route.
  const isPublicPath =
    pathname.startsWith("/api/auth/") || publicPaths.includes(pathname);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fail closed: without Supabase env we cannot verify a session, so protected
  // pages must not render. Public paths (notably /login) stay reachable so
  // there is no redirect loop.
  if (!supabaseUrl || !supabaseAnonKey) {
    if (isPublicPath) {
      return NextResponse.next({ request });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session cookie on every request. If getUser throws (Supabase
  // unreachable, malformed token) we cannot verify the session, so fail
  // closed the same way as missing env: protected paths redirect to /login,
  // public paths pass through.
  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    if (isPublicPath) {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    {
      // Exclusions: static assets need neither the auth gate nor a per-request
      // nonce. /api/csp-report must stay outside the gate — violation reports
      // arrive from unauthenticated visitors, and routing them through the
      // session check would 307 the POST to /login and drop the telemetry the
      // sink exists to collect. Prefetch requests are skipped per the Next.js
      // CSP guidance: they yield RSC payloads rather than documents, so a
      // nonce is meaningless there, and the real navigation that follows still
      // passes through the proxy (protected routes additionally verify the
      // session at render time in src/app/(app)/layout.tsx, so skipping the
      // gate for prefetches does not expose them).
      source:
        "/((?!_next/static|_next/image|favicon.ico|api/csp-report|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
