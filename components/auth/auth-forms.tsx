"use client";

import { useActionState } from "react";

import {
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
  type AuthActionState,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const initialState: AuthActionState = {};

const fieldClassName = cn(
  "h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground",
  "outline-none placeholder:text-muted-foreground",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

const labelClassName = "text-sm font-medium text-foreground";

function FormMessage({ state }: { state: AuthActionState }) {
  if (state.error) {
    return (
      <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
        {state.error}
      </p>
    );
  }

  if (state.success) {
    return (
      <p className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground" role="status">
        {state.success}
      </p>
    );
  }

  return null;
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next || "/etusivu"} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={labelClassName}>
          Sähköposti
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={fieldClassName}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={labelClassName}>
          Salasana
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={fieldClassName}
        />
      </div>
      <FormMessage state={state} />
      <Button type="submit" size="lg" className="h-11 px-4 text-base" disabled={pending}>
        {pending ? "Kirjaudutaan…" : "Kirjaudu sisään"}
      </Button>
    </form>
  );
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  if (state.needsConfirmation) {
    return (
      <div className="rounded-xl bg-card px-5 py-5 ring-1 ring-foreground/10">
        <h2 className="text-base font-medium">Vahvista sähköpostisi</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Lähetimme sinulle vahvistuslinkin. Avaa se sähköpostistasi, niin
          tilisi aktivoituu. Tarkista myös roskapostikansio.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={labelClassName}>
          Sähköposti
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={fieldClassName}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={labelClassName}>
          Salasana
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          className={fieldClassName}
        />
      </div>
      <FormMessage state={state} />
      <Button type="submit" size="lg" className="h-11 px-4 text-base" disabled={pending}>
        {pending ? "Luodaan tiliä…" : "Luo tili"}
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={labelClassName}>
          Sähköposti
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={fieldClassName}
        />
      </div>
      <FormMessage state={state} />
      <Button type="submit" size="lg" className="h-11 px-4 text-base" disabled={pending}>
        {pending ? "Lähetetään…" : "Lähetä palautuslinkki"}
      </Button>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePassword,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={labelClassName}>
          Uusi salasana
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          className={fieldClassName}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm" className={labelClassName}>
          Vahvista salasana
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          className={fieldClassName}
        />
      </div>
      <FormMessage state={state} />
      <Button type="submit" size="lg" className="h-11 px-4 text-base" disabled={pending}>
        {pending ? "Tallennetaan…" : "Tallenna uusi salasana"}
      </Button>
    </form>
  );
}
