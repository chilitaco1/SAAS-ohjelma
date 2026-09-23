import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Unohtunut salasana",
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 md:px-8 md:py-24">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Unohtuiko salasana?
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Anna sähköpostiosoitteesi, niin lähetämme sinulle linkin salasanan
          vaihtamiseen.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Takaisin kirjautumiseen
        </Link>
      </p>
    </div>
  );
}
