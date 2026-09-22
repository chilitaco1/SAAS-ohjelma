import type { Metadata } from "next";
import Link from "next/link";

import { SignInLink } from "@/components/marketing/actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Aloita ilmaiseksi",
};

export default function SignupPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-16 md:px-8 md:py-24">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Aloita ilmaiseksi</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Rekisteröityminen ei ole vielä käytössä. Tiliä ei voi vielä luoda
          tältä sivulta.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <SignInLink />
        <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-4 text-base")}>
          Takaisin etusivulle
        </Link>
      </div>
    </div>
  );
}
