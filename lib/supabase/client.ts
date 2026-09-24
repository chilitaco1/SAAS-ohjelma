import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser (Client Component) Supabase client.
 * Runs in the user's browser and reads/writes the auth session cookie there.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
