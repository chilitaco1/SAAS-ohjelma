import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Path prefixes that require a signed-in user. These are the pages that live
 * under the app shell (app/(app)/...). Everything else — the marketing
 * homepage, /login, /signup, /forgot-password, /update-password and the
 * /auth/* handlers — stays public.
 */
const PROTECTED_PREFIXES = [
  "/etusivu",
  "/laskut",
  "/asiakkaat",
  "/tuotteet",
  "/yritys",
  "/asetukset",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Runs on every matched request (see proxy.ts). It does two things:
 *
 * 1. Refreshes the Supabase auth token and forwards the new cookies to both
 *    the browser and any Server Components rendered for this request. This is
 *    what keeps a signed-in user signed in.
 * 2. Redirects signed-out visitors away from protected pages to /login.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: `getUser()` revalidates the token with Supabase and refreshes it
  // when needed. Do not add code between creating the client and this call, and
  // do not remove it, or sessions can be dropped at random.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Must return `supabaseResponse` so the refreshed cookies reach the browser.
  return supabaseResponse;
}
