import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/auth-forms";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Kirjaudu sisään",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-16 md:px-8 md:py-24">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Kirjaudu sisään</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Kirjaudu tilillesi sähköpostilla ja salasanalla.
        </p>
      </div>

      {params.error === "auth" ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          Kirjautumislinkki ei kelpaa tai on vanhentunut. Kokeile uudelleen.
        </p>
      ) : null}

      <LoginForm next={params.next} />

      <div className="flex flex-col gap-3 text-sm">
        <Link
          href="/unohditko-salasanan"
          className="text-primary underline-offset-4 hover:underline"
        >
          Unohditko salasanan?
        </Link>
        <p className="text-muted-foreground">
          Ei tiliä vielä?{" "}
          <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
            Aloita ilmaiseksi
          </Link>
        </p>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 w-fit px-4 text-base")}
        >
          Takaisin etusivulle
        </Link>
      </div>
    </div>
  );
}
