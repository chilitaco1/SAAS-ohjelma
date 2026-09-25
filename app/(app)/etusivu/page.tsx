import Link from "next/link";

import { CreateInvoiceLink } from "@/components/create-invoice-link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { decimalToScaled, formatFinnishDate, todayInHelsinki } from "@/lib/invoices/calculate";
import { listInvoices } from "@/lib/invoices/queries";
import { invoiceStatusLabel } from "@/lib/invoices/types";
import { formatEuro } from "@/lib/money";

export default async function DashboardPage() {
  const result = await listInvoices();
  const today = todayInHelsinki();
  const month = today.slice(0, 7);
  const invoices = result.ok ? result.invoices : [];

  const invoicedThisMonth = invoices
    .filter(
      (invoice) =>
        (invoice.status === "sent" || invoice.status === "paid") &&
        invoice.issue_date?.startsWith(month),
    )
    .reduce((sum, invoice) => sum + decimalToScaled(invoice.total_including_vat, 2), 0);

  const openCount = invoices.filter(
    (invoice) =>
      invoice.status === "sent" && (!invoice.due_date || invoice.due_date >= today),
  ).length;

  const overdueCount = invoices.filter(
    (invoice) =>
      invoice.status === "sent" && invoice.due_date !== null && invoice.due_date < today,
  ).length;

  const paidCount = invoices.filter((invoice) => invoice.status === "paid").length;

  const stats = [
    {
      label: "Laskutettu tässä kuussa",
      value: formatEuro(invoicedThisMonth),
      hint: "Lähetetyt ja maksetut laskut",
    },
    {
      label: "Avoimet laskut",
      value: String(openCount),
      hint: "Lähetetty, ei vielä maksettu",
    },
    {
      label: "Erääntyneet",
      value: String(overdueCount),
      hint: "Lähetetty lasku, jonka eräpäivä on mennyt",
    },
    {
      label: "Maksetut",
      value: String(paidCount),
      hint: "Merkitty maksetuiksi",
    },
  ];

  const recent = invoices.slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Etusivu"
        description="Tästä näet kuukauden laskutuksen yhdellä silmäyksellä."
        action={<CreateInvoiceLink />}
      />

      {!result.ok && result.reason === "missing-table" ? (
        <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm leading-6 text-muted-foreground">
          Laskujen tallennus ei ole vielä käytössä tietokannassa. Avaa Supabase
          → SQL Editor, liitä tiedoston supabase/migrations/20260925160000_create_invoices.sql
          sisältö ja aja se.
        </p>
      ) : null}

      <section aria-label="Yhteenveto" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-semibold tracking-tight tabular-nums">
                {stat.value}
              </p>
            </CardHeader>
            <CardContent className="text-xs leading-5 text-muted-foreground">
              {stat.hint}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">Viimeisimmät laskut</h2>
        {recent.length === 0 ? (
          <EmptyState title="Ei vielä laskuja">
            Kun julkaiset laskun, se näkyy tässä. Numero, esimerkiksi INV-1001,
            annetaan vasta julkaisuhetkellä.
          </EmptyState>
        ) : (
          <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            <ul className="divide-y divide-border">
              {recent.map((invoice) => (
                <li key={invoice.id}>
                  <Link
                    href={`/laskut/${invoice.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 text-sm hover:bg-muted/60"
                  >
                    <span>
                      <span className="font-medium">
                        {invoice.invoice_number ?? "Luonnos"}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {invoice.customer_name ?? "Ei asiakasta"}
                        {invoice.issue_date ? ` · ${formatFinnishDate(invoice.issue_date)}` : ""}
                        {" · "}
                        {invoiceStatusLabel[invoice.status]}
                      </span>
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatEuro(decimalToScaled(invoice.total_including_vat, 2))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
