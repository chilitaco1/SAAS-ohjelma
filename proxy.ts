import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 "proxy" (formerly middleware).
 * Runs before matched routes to refresh the auth session and guard app pages.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and images.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
