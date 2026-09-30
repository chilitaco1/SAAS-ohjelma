"use client";

import { Dialog } from "@base-ui/react/dialog";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConfirmDeleteDialogProps = {
  triggerLabel: string;
  title: string;
  description: string;
  id: string;
  action: (formData: FormData) => void | Promise<void>;
  pending?: boolean;
};

/** Same confirm step as deleting a draft: nothing is removed until Poista is pressed. */
export function ConfirmDeleteDialog({
  triggerLabel,
  title,
  description,
  id,
  action,
  pending,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger
        type="button"
        disabled={pending}
        className={cn(buttonVariants({ variant: "ghost" }))}
      >
        {triggerLabel}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card px-5 py-5 text-foreground ring-1 ring-foreground/10">
          <Dialog.Title className="text-base font-medium">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </Dialog.Description>
          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close
              type="button"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-4 text-base")}
            >
              Peruuta
            </Dialog.Close>
            <form action={action}>
              <input type="hidden" name="id" value={id} />
              <Button
                type="submit"
                variant="destructive"
                size="lg"
                className="h-11 px-4 text-base"
                disabled={pending}
              >
                Poista
              </Button>
            </form>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
