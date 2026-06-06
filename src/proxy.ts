import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/", "/login", "/api/auth/callback", "/reset-password"];

export async function proxy(request: NextRequest) {
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
