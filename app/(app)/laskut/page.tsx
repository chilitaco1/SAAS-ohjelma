import type { Metadata } from "next";
import Link from "next/link";

import { CreateInvoiceLink } from "@/components/create-invoice-link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { decimalToScaled, formatFinnishDate } from "@/lib/invoices/calculate";
import { listInvoices } from "@/lib/invoices/queries";
import { invoiceStatusLabel } from "@/lib/invoices/types";
import { formatEuro } from "@/lib/money";

export const metadata: Metadata = {
  title: "Laskut",
};

const SETUP_HINT =
  "Laskujen tallennus ei ole vielä käytössä tietokannassa. Avaa Supabase → SQL Editor, liitä tiedoston supabase/migrations/20260925160000_create_invoices.sql sisältö ja aja se.";

export default async function InvoicesPage() {
  const result = await listInvoices();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Laskut"
        description="Täällä hallitset luonnoksia, lähetettyjä, maksettuja ja peruttuja laskuja."
        action={<CreateInvoiceLink />}
      />

      {!result.ok ? (
        <EmptyState title="Tietokanta puuttuu">
          {result.reason === "missing-table"
            ? SETUP_HINT
            : "Laskuja ei juuri nyt saatu haettua. Yritä hetken päästä uudelleen."}
        </EmptyState>
      ) : result.invoices.length === 0 ? (
        <EmptyState title="Ei vielä laskuja">
          Luonnos on yksityinen työversio, eikä sillä ole laskunumeroa. Numero
          INV-1001, INV-1002 ja niin edelleen annetaan, kun julkaiset laskun.
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <ul className="divide-y divide-border">
            {result.invoices.map((invoice) => (
              <li key={invoice.id}>
                <Link
                  href={`/laskut/${invoice.id}`}
                  className="grid gap-1 px-5 py-4 transition-colors hover:bg-muted/60 sm:grid-cols-[8rem_1fr_auto_auto] sm:items-center sm:gap-4"
                >
                  <span className="font-medium">
                    {invoice.invoice_number ?? "Luonnos"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {invoice.customer_name ?? "Ei asiakasta"}
                    {invoice.issue_date ? ` · ${formatFinnishDate(invoice.issue_date)}` : ""}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {invoiceStatusLabel[invoice.status]}
                  </span>
                  <span className="text-sm font-medium tabular-nums sm:text-right">
                    {formatEuro(decimalToScaled(invoice.total_including_vat, 2))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
