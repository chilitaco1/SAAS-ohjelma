import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Handles redirects from Supabase Auth emails (confirm signup, reset password).
 * Exchanges the one-time `code` for a session cookie, then sends the user onward.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") ? nextParam : "/etusivu";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
