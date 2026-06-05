import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  // Prevent open redirect: only allow same-origin relative paths. Reject
  // protocol-relative ("//host") and backslash-prefixed ("/\host", which many
  // browsers normalize to "//host") forms that would escape the trusted base.
  const next =
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.startsWith("/\\")
      ? rawNext
      : "/dashboard";

  // Build redirects from a TRUSTED base. `origin` comes from the request URL,
  // which behind a proxy reflects the attacker-controllable Host/X-Forwarded-Host
  // header (host-header injection -> open redirect on the post-auth bounce).
  // NEXT_PUBLIC_SITE_URL pins the base in production; fall back to the request
  // origin only in local dev where the env is unset. new URL(...).origin
  // canonically strips any path/query/fragment, so a misconfigured env that
  // carries a path cannot bleed into the redirect target (a bare trailing-slash
  // strip would leave it glued on). NEXT_PUBLIC_* is build-time-fixed, so a
  // malformed value is a deploy misconfig that should fail loud, not silently
  // fall back to the request origin (which would reopen the injection vector).
  const base = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? origin).origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(`${base}/login?error=auth_failed`);
}
