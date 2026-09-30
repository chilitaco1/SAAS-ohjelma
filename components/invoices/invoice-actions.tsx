"use client";

import {
  cancelInvoice,
  markInvoicePaid,
  resendInvoiceEmail,
  unmarkInvoicePaid,
} from "@/app/actions/invoices";
import { Button, buttonVariants } from "@/components/ui/button";
import type { InvoiceStatus } from "@/lib/invoices/types";
import { cn } from "@/lib/utils";
import { useState, type FormEvent } from "react";

type InvoiceActionsProps = {
  invoiceId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  today: string;
};

const dateClassName = cn(
  "h-11 rounded-lg border border-border bg-card px-3 text-base text-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

/**
 * Actions for an issued invoice. The document itself stays read-only.
 * The database allows only sent → paid, paid → sent, and sent → canceled.
 */
export function InvoiceActions({
  invoiceId,
  invoiceNumber,
  status,
  today,
}: InvoiceActionsProps) {
  const [notice, setNotice] = useState<string | null>(null);

  function handleCreateCreditNote() {
    setNotice("Hyvityslasku tulee seuraavaksi. Tätä laskua ei muuteta.");
  }

  function confirmCancel(event: FormEvent<HTMLFormElement>) {
    const ok = window.confirm(
      `Haluatko varmasti peruuttaa laskun ${invoiceNumber}? Laskun numero säilyy, eikä sitä voi käyttää uudelleen.`,
    );
    if (!ok) {
      event.preventDefault();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {status === "sent" ? (
        <form
          action={markInvoicePaid}
          className="flex flex-col gap-3 rounded-xl bg-card px-5 py-5 ring-1 ring-foreground/10 sm:flex-row sm:items-end"
        >
          <input type="hidden" name="id" value={invoiceId} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="paid-at" className="text-sm font-medium">
              Maksupäivä
            </label>
            <input
              id="paid-at"
              name="paidAt"
              type="date"
              required
              defaultValue={today}
              className={dateClassName}
            />
          </div>
          <Button type="submit" size="lg" className="h-11 px-4 text-base">
            Merkitse maksetuksi
          </Button>
        </form>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {status === "paid" ? (
          <form action={unmarkInvoicePaid}>
            <input type="hidden" name="id" value={invoiceId} />
            <Button type="submit" variant="outline" size="lg" className="h-11 px-4 text-base">
              Peru maksettu-merkintä
            </Button>
          </form>
        ) : null}
        {status === "sent" ? (
          <form action={cancelInvoice} onSubmit={confirmCancel}>
            <input type="hidden" name="id" value={invoiceId} />
            <Button type="submit" variant="destructive" size="lg" className="h-11 px-4 text-base">
              Peruuta lasku
            </Button>
          </form>
        ) : null}
        <form action={resendInvoiceEmail}>
          <input type="hidden" name="id" value={invoiceId} />
          <Button type="submit" variant="outline" size="lg" className="h-11 px-4 text-base">
            Lähetä uudelleen sähköpostilla
          </Button>
        </form>
        <a
          href={`/api/invoices/${invoiceId}/pdf`}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-4 text-base")}
        >
          Lataa PDF
        </a>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-11 px-4 text-base"
          onClick={handleCreateCreditNote}
        >
          Luo hyvityslasku
        </Button>
      </div>
      {notice ? (
        <p className="text-sm text-muted-foreground" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
