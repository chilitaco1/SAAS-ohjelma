import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Kirjaudu sisään",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
}) {
  const params = await searchParams;
  const redirectTo =
    params.redirectTo && params.redirectTo.startsWith("/")
      ? params.redirectTo
      : undefined;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 md:px-8 md:py-24">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Kirjaudu sisään</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Kirjaudu sisään sähköpostilla ja salasanalla.
        </p>
      </div>

      {params.error === "auth" ? (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          Linkki oli virheellinen tai vanhentunut. Yritä uudelleen.
        </p>
      ) : null}

      <LoginForm redirectTo={redirectTo} />

      <p className="text-sm text-muted-foreground">
        Ei vielä tiliä?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Luo tili
        </Link>
      </p>
    </div>
  );
}
