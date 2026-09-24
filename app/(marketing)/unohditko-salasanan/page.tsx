import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Unohditko salasanan?",
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-16 md:px-8 md:py-24">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Unohditko salasanan?</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Anna tilisi sähköposti. Lähetämme sinulle linkin, jolla voit asettaa
          uuden salasanan.
        </p>
      </div>

      <ForgotPasswordForm />

      <div className="flex flex-col gap-3 text-sm">
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          Takaisin kirjautumiseen
        </Link>
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
