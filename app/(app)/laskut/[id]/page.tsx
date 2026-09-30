import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { InvoiceActions } from "@/components/invoices/invoice-actions";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { SentInvoice } from "@/components/invoices/sent-invoice";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { formatFinnishTimestamp, todayInHelsinki } from "@/lib/invoices/calculate";
import { invoiceToForm } from "@/lib/invoices/form-values";
import { getCompanySettings, getInvoice, sellerForInvoice } from "@/lib/invoices/queries";
import { invoiceDisplayLabel } from "@/lib/invoices/types";
import { listCustomers, listProducts } from "@/lib/catalog/queries";

export const metadata: Metadata = {
  title: "Lasku",
};

type InvoicePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    link?: string;
    link2?: string;
    published?: string;
    saved?: string;
    paid?: string;
    unpaid?: string;
    canceled?: string;
    emailed?: string;
    emailMissing?: string;
    emailError?: string;
    emailStored?: string;
  }>;
};

function safeAppLink(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  if (value === "/yritys" || value === "/asiakkaat") {
    return value;
  }
  if (/^\/asiakkaat\?muokkaa=[0-9a-f-]{36}$/i.test(value)) {
    return value;
  }
  return null;
}

function linkLabel(href: string): string {
  return href.startsWith("/yritys") ? "Avaa Yritys-sivu" : "Muokkaa asiakasta";
}

export default async function InvoicePage({ params, searchParams }: InvoicePageProps) {
  const { id } = await params;
  const query = await searchParams;

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    notFound();
  }

  const invoice = await getInvoice(id);
  if (!invoice) {
    notFound();
  }

  const notices: string[] = [];
  if (query.published) {
    notices.push(`Lasku ${invoice.invoice_number ?? ""} on julkaistu. Sitä ei voi enää muokata.`);
  } else if (query.saved) {
    notices.push("Luonnos tallennettiin. Laskunumeroa ei ole vielä annettu.");
  } else if (query.paid) {
    notices.push("Lasku merkittiin maksetuksi. Summia ei muutettu.");
  } else if (query.unpaid) {
    notices.push("Maksettu-merkintä peruttiin. Lasku on taas lähetetty.");
  } else if (query.canceled) {
    notices.push("Lasku peruutettiin. Numero säilyy, eikä sitä käytetä uudelleen.");
  }
  if (query.emailed) {
    notices.push("Lasku lähetettiin sähköpostilla.");
  }
  if (query.emailStored === "0") {
    notices.push(
      "Sähköposti lähetettiin, mutta lähetysaikaa ei voitu tallentaa. Avaa Supabase → SQL Editor ja aja tiedosto supabase/migrations/20260928233000_invoice_email.sql.",
    );
  }
  const notice = notices.length > 0 ? notices.join(" ") : undefined;

  const today = todayInHelsinki();
  const title = invoice.invoice_number ?? "Luonnos";
  const issued = invoice.status !== "draft";
  const seller = issued ? sellerForInvoice(invoice, await getCompanySettings()) : null;
  const catalog = issued ? null : await Promise.all([listCustomers(), listProducts()]);
  const errorLinks = [safeAppLink(query.link), safeAppLink(query.link2)].filter(
    (href): href is string => href !== null,
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={title}
        description={
          invoice.status === "draft"
            ? "Luonnos. Julkaisu antaa laskunumeron ja viitenumeron."
            : `${invoiceDisplayLabel(invoice.status, invoice.due_date, today)}. Julkaistua laskua ei voi muokata.`
        }
      />
      {query.error ? (
        <p
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive"
          role="alert"
        >
          {query.error}{" "}
          {errorLinks.map((href, index) => (
            <span key={href}>
              {index > 0 ? " " : null}
              <Link href={href} className="font-medium underline underline-offset-4">
                {linkLabel(href)}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
      {query.emailError ? (
        <p
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive"
          role="alert"
        >
          {query.emailError}
          {query.published ? " Laskunumero on silti annettu." : ""}
        </p>
      ) : null}
      {query.emailMissing ? (
        <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm leading-6">
          Sähköpostia ei lähetetty, koska asiakkaalta puuttuu sähköpostiosoite. Lisää
          osoite ja käytä painiketta Lähetä uudelleen sähköpostilla.{" "}
          {!query.error
            ? errorLinks.map((href, index) => (
                <span key={href}>
                  {index > 0 ? " " : null}
                  <Link href={href} className="font-medium underline underline-offset-4">
                    {linkLabel(href)}
                  </Link>
                </span>
              ))
            : null}
        </p>
      ) : null}
      {issued && invoice.email_sent_at ? (
        <p className="text-sm text-muted-foreground">
          Lähetetty sähköpostilla {formatFinnishTimestamp(invoice.email_sent_at)}.
        </p>
      ) : null}
      {issued ? (
        <InvoiceActions
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoice_number ?? "lasku"}
          status={invoice.status}
          today={today}
        />
      ) : null}
      {issued && seller ? (
        <SentInvoice invoice={invoice} seller={seller} notice={notice} />
      ) : (
        <InvoiceForm
          initial={invoiceToForm(invoice)}
          notice={notice}
          customers={catalog?.[0].items ?? []}
          products={catalog?.[1].items ?? []}
          catalogMissing={Boolean(catalog?.[0].missing || catalog?.[1].missing)}
        />
      )}
      <Link href="/laskut" className={buttonVariants({ variant: "outline" })}>
        Takaisin laskuihin
      </Link>
    </div>
  );
}
