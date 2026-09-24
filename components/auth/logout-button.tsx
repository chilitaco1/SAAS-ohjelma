"use client";

import { useTransition } from "react";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="h-11 px-4 text-base"
      disabled={pending}
      onClick={() => {
        startTransition(() => {
          void signOut();
        });
      }}
    >
      {pending ? "Kirjaudutaan ulos…" : "Kirjaudu ulos"}
    </Button>
  );
}
