"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
  success?: string;
  needsConfirmation?: boolean;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function getOrigin() {
  const headerStore = await headers();
  return headerStore.get("origin") ?? "http://localhost:43124";
}

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = getString(formData, "email");
  const password = getString(formData, "password");

  if (!email || !password) {
    return { error: "Anna sekä sähköposti että salasana." };
  }

  if (password.length < 6) {
    return { error: "Salasanan on oltava vähintään 6 merkkiä." };
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If the project requires email confirmation, there is no session yet.
  if (!data.session) {
    return { needsConfirmation: true };
  }

  redirect("/etusivu");
}

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const next = getString(formData, "next") || "/etusivu";

  if (!email || !password) {
    return { error: "Anna sekä sähköposti että salasana." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Sähköposti tai salasana on väärin." };
  }

  redirect(next.startsWith("/") ? next : "/etusivu");
}

export async function requestPasswordReset(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = getString(formData, "email");

  if (!email) {
    return { error: "Anna sähköpostiosoite." };
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/vaihda-salasana`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success:
      "Jos tili löytyi, lähetimme palautuslinkin sähköpostiisi. Tarkista myös roskaposti.",
  };
}

export async function updatePassword(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = getString(formData, "password");
  const confirm = getString(formData, "confirm");

  if (!password || password.length < 6) {
    return { error: "Salasanan on oltava vähintään 6 merkkiä." };
  }

  if (password !== confirm) {
    return { error: "Salasanat eivät täsmää." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/etusivu");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
