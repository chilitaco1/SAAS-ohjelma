import Link from "next/link";

import { InvoiceLines } from "@/components/invoices/invoice-lines";
import { formatFinnishDate } from "@/lib/invoices/calculate";
import { invoiceToForm } from "@/lib/invoices/form-values";
import { formatReferenceNumber } from "@/lib/invoices/reference";
import type { CompanySettings, InvoiceWithItems } from "@/lib/invoices/types";

type SentInvoiceProps = {
  invoice: InvoiceWithItems;
  seller: CompanySettings;
  notice?: string;
  error?: string;
};

function formatIban(value: string): string {
  return value
    .replace(/\s/g, "")
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function PartyLines({ lines }: { lines: Array<string | null> }) {
  const visible = lines.filter((line): line is string => Boolean(line));
  if (visible.length === 0) {
    return <p className="text-sm text-muted-foreground">Ei tietoja</p>;
  }

  return (
    <div className="mt-2 space-y-1 text-sm leading-6">
      {visible.map((line, index) => (
        <p key={`${index}-${line}`} className="whitespace-pre-line">
          {line}
        </p>
      ))}
    </div>
  );
}

/** Read-only view of an issued Finnish invoice. Drafts use the edit form. */
export function SentInvoice({ invoice, seller, notice, error }: SentInvoiceProps) {
  const form = invoiceToForm(invoice);
  const sellerMissing = !seller.company_name;

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground" role="status">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl bg-card px-5 py-5 ring-1 ring-foreground/10">
          <h2 className="text-base font-medium">Myyjä</h2>
          {sellerMissing ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Yrityksen nimi, Y-tunnus ja pankkitiedot puuttuvat.{" "}
              <Link href="/yritys" className="text-primary underline-offset-4 hover:underline">
                Täytä ne Yritys-sivulla
              </Link>
              .
            </p>
          ) : (
            <PartyLines
              lines={[
                seller.company_name,
                seller.y_tunus ? `Y-tunnus ${seller.y_tunus}` : null,
                seller.billing_address,
                seller.iban ? `IBAN ${formatIban(seller.iban)}` : null,
                seller.bic_swift ? `BIC ${seller.bic_swift}` : null,
              ]}
            />
          )}
        </section>

        <section className="rounded-xl bg-card px-5 py-5 ring-1 ring-foreground/10">
          <h2 className="text-base font-medium">Asiakas</h2>
          <PartyLines
            lines={[
              invoice.customer_name,
              invoice.customer_y_tunus ? `Y-tunnus ${invoice.customer_y_tunus}` : null,
              invoice.customer_address,
              invoice.customer_email,
            ]}
          />
        </section>
      </div>

      <InvoiceLines rows={form.rows} readOnly />

      <dl className="grid gap-3 rounded-xl bg-card px-5 py-5 text-sm ring-1 ring-foreground/10 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Laskun päivä</dt>
          <dd className="mt-1 font-medium">
            {invoice.issue_date ? formatFinnishDate(invoice.issue_date) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Eräpäivä</dt>
          <dd className="mt-1 font-medium">
            {invoice.due_date ? formatFinnishDate(invoice.due_date) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Maksuehto</dt>
          <dd className="mt-1 font-medium">
            {invoice.payment_terms_days === null ? "—" : `${invoice.payment_terms_days} päivää`}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Toimituspäivä</dt>
          <dd className="mt-1 font-medium">
            {invoice.delivery_date ? formatFinnishDate(invoice.delivery_date) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Viitenumero</dt>
          <dd className="mt-1 font-medium tabular-nums">
            {invoice.reference_number ? formatReferenceNumber(invoice.reference_number) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Viivästyskorko</dt>
          <dd className="mt-1 font-medium tabular-nums">
            {invoice.interest_rate ? `${invoice.interest_rate.replace(".", ",")} %` : "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
