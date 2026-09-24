import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Turns the email link's `next` value into a safe in-app path. It accepts a
 * plain path ("/etusivu") or an absolute URL on this same site (in which case
 * only the path is kept), and falls back to the dashboard for anything else.
 */
function safeNextPath(next: string | null, origin: string): string {
  if (!next) return "/etusivu";
  if (next.startsWith("/")) return next;
  try {
    const url = new URL(next);
    if (url.origin === origin) return url.pathname + url.search;
  } catch {
    // Not a valid URL — fall through to the default.
  }
  return "/etusivu";
}

/**
 * Handles the link Supabase emails to the user for both sign-up confirmation
 * and password recovery. It verifies the one-time token (which signs the user
 * in) and then forwards them to `next` — the dashboard for sign-up, or the
 * set-new-password page for recovery.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextPath = safeNextPath(searchParams.get("next"), origin);

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return NextResponse.redirect(new URL(nextPath, request.url));
    }
  }

  // The link was invalid or expired.
  return NextResponse.redirect(new URL("/login?error=auth", request.url));
}
