"use client";

import { useActionState } from "react";

import { updatePassword } from "@/app/auth/actions";
import type { AuthFormState } from "@/app/auth/types";
import { AuthError } from "@/components/auth/auth-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    updatePassword,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Uusi salasana</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
        <p className="text-xs text-muted-foreground">Vähintään 6 merkkiä.</p>
      </div>

      <AuthError message={state?.error} />

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="h-11 text-base"
      >
        {pending ? "Tallennetaan…" : "Tallenna uusi salasana"}
      </Button>
    </form>
  );
}
