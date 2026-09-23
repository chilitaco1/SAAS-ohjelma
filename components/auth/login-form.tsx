"use client";

import Link from "next/link";
import { useActionState } from "react";

import { login } from "@/app/auth/actions";
import type { AuthFormState } from "@/app/auth/types";
import { AuthError } from "@/components/auth/auth-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    login,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {redirectTo ? (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      ) : null}

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
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="password">Salasana</Label>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary hover:underline"
          >
            Unohtuiko salasana?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <AuthError message={state?.error} />

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="h-11 text-base"
      >
        {pending ? "Kirjaudutaan…" : "Kirjaudu sisään"}
      </Button>
    </form>
  );
}
