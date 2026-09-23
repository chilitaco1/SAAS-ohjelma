"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { AuthFormState } from "@/app/auth/types";

function readEmailPassword(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

/** Absolute origin (e.g. http://localhost:43123) for building email links. */
async function getOrigin() {
  const headerList = await headers();
  const origin = headerList.get("origin");
  if (origin) return origin;

  const host = headerList.get("host") ?? "localhost:43123";
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
}

/** Only allow redirecting to in-app paths, never to an external URL. */
function safeInternalPath(value: FormDataEntryValue | null, fallback: string) {
  const path = String(value ?? "");
  return path.startsWith("/") ? path : fallback;
}

export async function login(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password } = readEmailPassword(formData);
  if (!email || !password) {
    return { error: "Anna sähköposti ja salasana." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Sähköposti tai salasana ei täsmää." };
  }

  revalidatePath("/", "layout");
  redirect(safeInternalPath(formData.get("redirectTo"), "/etusivu"));
}

export async function signup(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password } = readEmailPassword(formData);
  if (!email || !password) {
    return { error: "Anna sähköposti ja salasana." };
  }
  if (password.length < 6) {
    return { error: "Salasanan pitää olla vähintään 6 merkkiä." };
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Where the confirmation link in the email should send the user after
      // the address is confirmed. This is the email template's {{ .RedirectTo }}.
      emailRedirectTo: `${origin}/etusivu`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If the project has email confirmation switched off, Supabase returns a
  // ready-to-use session and we can send the user straight in.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/etusivu");
  }

  // Otherwise the user must click the link in their email first.
  return { status: "awaiting-confirmation" };
}

export async function requestPasswordReset(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Anna sähköpostiosoite." };
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // The email template turns this into {{ .RedirectTo }}; after the recovery
    // token is verified the user lands on the set-new-password page.
    redirectTo: `${origin}/update-password`,
  });

  if (error) {
    return { error: error.message };
  }

  // Always report success so the form doesn't reveal which emails have an
  // account.
  return { status: "reset-sent" };
}

export async function updatePassword(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) {
    return { error: "Salasanan pitää olla vähintään 6 merkkiä." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/etusivu");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}
