import type { Metadata } from "next";

import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = {
  title: "Uusi salasana",
};

export default function UpdatePasswordPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 md:px-8 md:py-24">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Uusi salasana</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Valitse uusi salasana tilillesi.
        </p>
      </div>

      <UpdatePasswordForm />
    </div>
  );
}
