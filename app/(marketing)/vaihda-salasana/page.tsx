import type { Metadata } from "next";
import Link from "next/link";

import { UpdatePasswordForm } from "@/components/auth/auth-forms";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Vaihda salasana",
};

export default function UpdatePasswordPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-16 md:px-8 md:py-24">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Vaihda salasana</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Valitse uusi salasana tilillesi. Avaa tämä sivu palautuslinkistä,
          jonka sait sähköpostiisi.
        </p>
      </div>

      <UpdatePasswordForm />

      <Link
        href="/login"
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 w-fit px-4 text-base")}
      >
        Takaisin kirjautumiseen
      </Link>
    </div>
  );
}
