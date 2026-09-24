"use client";

import { MailCheck } from "lucide-react";
import { useActionState } from "react";

import { signup } from "@/app/auth/actions";
import type { AuthFormState } from "@/app/auth/types";
import { AuthError } from "@/components/auth/auth-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    signup,
    undefined,
  );

  if (state?.status === "awaiting-confirmation") {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl bg-card px-5 py-5 ring-1 ring-foreground/10">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck />
        </span>
        <h2 className="text-lg font-medium">Vahvista sähköpostisi</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Lähetimme sinulle vahvistuslinkin. Avaa sähköpostisi ja klikkaa
          linkkiä, niin tilisi aktivoituu ja pääset kirjautumaan sisään.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Sähköposti</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Salasana</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
        <p className="text-xs text-muted-foreground">
          Vähintään 6 merkkiä.
        </p>
      </div>

      <AuthError message={state?.error} />

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="h-11 text-base"
      >
        {pending ? "Luodaan tiliä…" : "Luo tili"}
      </Button>
    </form>
  );
}
