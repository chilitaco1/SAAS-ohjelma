"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useState } from "react";

import { UpdatePasswordForm } from "@/components/auth/auth-forms";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AccountActions() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {open ? (
        <div className="flex flex-col items-start gap-4">
          <UpdatePasswordForm />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 w-fit px-4 text-base"
              onClick={() => setOpen(false)}
            >
              Peruuta
            </Button>
            <div className="w-fit">
              <LogoutButton />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 w-fit px-4 text-base"
            onClick={() => setOpen(true)}
          >
            Vaihda salasana
          </Button>
          <div className="w-fit">
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  );
}

/** Account deletion is not available yet. This dialog does not remove anything. */
export function DeleteAccountNotice() {
  return (
    <Dialog.Root>
      <Dialog.Trigger
        type="button"
        className={cn(
          buttonVariants({ variant: "destructive", size: "lg" }),
          "h-11 w-fit px-4 text-base",
        )}
      >
        Poista tili
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card px-5 py-5 text-foreground ring-1 ring-foreground/10">
          <Dialog.Title className="text-base font-medium">Poista tili</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
            Tilin poistaminen ei ole vielä käytössä. Tiliäsi ei poisteta.
          </Dialog.Description>
          <div className="mt-4 flex justify-end">
            <Dialog.Close
              type="button"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-4 text-base")}
            >
              Sulje
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
