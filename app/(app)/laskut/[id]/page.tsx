import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { InvoiceActions } from "@/components/invoices/invoice-actions";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { SentInvoice } from "@/components/invoices/sent-invoice";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { invoiceToForm } from "@/lib/invoices/form-values";
import { getCompanySettings, getInvoice, sellerForInvoice } from "@/lib/invoices/queries";
import { invoiceStatusLabel } from "@/lib/invoices/types";

export const metadata: Metadata = {
  title: "Lasku",
};

type InvoicePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; published?: string; saved?: string; paid?: string }>;
};

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

  const notice = query.published
    ? `Lasku ${invoice.invoice_number ?? ""} on julkaistu. Sitä ei voi enää muokata.`
    : query.saved
      ? "Luonnos tallennettiin. Laskunumeroa ei ole vielä annettu."
      : query.paid
        ? "Lasku merkittiin maksetuksi. Summia ei muutettu."
        : undefined;

  const title = invoice.invoice_number ?? "Luonnos";
  const issued = invoice.status !== "draft";
  const seller = issued ? sellerForInvoice(invoice, await getCompanySettings()) : null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={title}
        description={
          invoice.status === "draft"
            ? "Luonnos. Julkaisu antaa laskunumeron ja viitenumeron."
            : `${invoiceStatusLabel[invoice.status]}. Julkaistua laskua ei voi muokata.`
        }
      />
      {issued ? <InvoiceActions invoiceId={invoice.id} status={invoice.status} /> : null}
      {issued && seller ? (
        <SentInvoice
          invoice={invoice}
          seller={seller}
          notice={notice}
          error={query.error}
        />
      ) : (
        <InvoiceForm initial={invoiceToForm(invoice)} notice={query.error ?? notice} />
      )}
      <Link href="/laskut" className={buttonVariants({ variant: "outline" })}>
        Takaisin laskuihin
      </Link>
    </div>
  );
}
