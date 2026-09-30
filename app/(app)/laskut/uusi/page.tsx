import type { Metadata } from "next";
import Link from "next/link";

import { InvoiceForm } from "@/components/invoices/invoice-form";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { listCustomers, listProducts } from "@/lib/catalog/queries";
import { blankInvoiceForm } from "@/lib/invoices/form-values";

export const metadata: Metadata = {
  title: "Uusi lasku",
};

// The default invoice date is "today", so this page cannot be cached at build time.
export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const [customers, products] = await Promise.all([listCustomers(), listProducts()]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Uusi lasku"
        description="Täytä asiakas ja rivit. Luonnos säilyy ilman laskunumeroa, kunnes julkaiset sen."
      />
      <InvoiceForm
        initial={blankInvoiceForm()}
        customers={customers.items}
        products={products.items}
        catalogMissing={customers.missing || products.missing}
      />
      <Link href="/laskut" className={buttonVariants({ variant: "outline" })}>
        Takaisin laskuihin
      </Link>
    </div>
  );
}
