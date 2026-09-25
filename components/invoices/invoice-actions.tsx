"use client";

import { useState } from "react";

import { markInvoicePaid } from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import type { InvoiceStatus } from "@/lib/invoices/types";

type InvoiceActionsProps = {
  invoiceId: string;
  status: InvoiceStatus;
};

/**
 * Actions for an issued invoice. The document itself stays read-only.
 * PDF and the credit note are wired next; the buttons only record the intent.
 */
export function InvoiceActions({ invoiceId, status }: InvoiceActionsProps) {
  const [notice, setNotice] = useState<string | null>(null);

  function handleDownloadPDF() {
    setNotice("PDF-lataus tulee seuraavaksi. Laskun tiedot ovat jo tallessa.");
  }

  function handleCreateCreditNote() {
    setNotice("Hyvityslasku tulee seuraavaksi. Tätä laskua ei muuteta.");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {status === "sent" ? (
          <form action={markInvoicePaid}>
            <input type="hidden" name="id" value={invoiceId} />
            <Button type="submit" size="lg" className="h-11 px-4 text-base">
              Merkitse maksetuksi
            </Button>
          </form>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-11 px-4 text-base"
          onClick={handleDownloadPDF}
        >
          Lataa PDF
        </Button>
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
