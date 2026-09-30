import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/etusivu",
  "/laskut",
  "/asiakkaat",
  "/tuotteet",
  "/yritys",
  "/asetukset",
];

/** Logged-out forms. Every other server action must already have a session. */
const PUBLIC_ACTION_PREFIXES = [
  "/login",
  "/signup",
  "/unohditko-salasanan",
  "/vaihda-salasana",
];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isProtectedPath(pathname: string) {
  return matchesPrefix(pathname, PROTECTED_PREFIXES);
}

function isPublicActionPath(pathname: string) {
  return matchesPrefix(pathname, PUBLIC_ACTION_PREFIXES);
}

/**
 * Refreshes the Supabase auth session cookie and stops logged-out requests
 * to app pages, /api, and server actions. Login and password forms stay open.
 * Called from the root `proxy.ts` (Next.js 16 name for middleware).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getClaims().
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const pathname = request.nextUrl.pathname;
  const serverAction = request.headers.has("next-action");

  if (!user && pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // A server action posted at the marketing site (or any other public URL)
  // would otherwise run. Login and password pages are the exception.
  // Actions posted at /etusivu, /laskut, and the other app pages are sent
  // to the login page below, so they do not run either.
  if (
    !user &&
    serverAction &&
    !isPublicActionPath(pathname) &&
    !isProtectedPath(pathname)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
