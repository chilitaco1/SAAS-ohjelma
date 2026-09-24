import type { Metadata } from "next";

import { CreateInvoiceLink } from "@/components/create-invoice-link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Laskut",
};

export default function InvoicesPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Laskut"
        description="Täällä hallitset luonnoksia, lähetettyjä, maksettuja ja peruttuja laskuja."
        action={<CreateInvoiceLink />}
      />
      <EmptyState title="Ei vielä laskuja">
        Luonnos on yksityinen työversio, eikä sillä ole laskunumeroa. Numero
        INV-1001, INV-1002 ja niin edelleen annetaan, kun merkitset laskun
        lähetetyksi. Erääntynyt lasku on lähetetty lasku, jonka eräpäivä on
        mennyt.
      </EmptyState>
    </div>
  );
}
