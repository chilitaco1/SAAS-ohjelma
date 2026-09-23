import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

// In Next.js 16 this file used to be called `middleware.ts`. It keeps the
// Supabase session fresh and guards the signed-in pages. See
// lib/supabase/proxy.ts for the actual logic.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on all request paths except static assets and image files, so the
     * proxy can refresh the session on normal page and data requests.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
