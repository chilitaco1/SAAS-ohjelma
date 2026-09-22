import type { Metadata } from "next";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Asiakkaat",
};

export default function CustomersPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Asiakkaat"
        description="Tänne tallennat yritykset ja ihmiset, joille lähetät laskuja."
      />
      <EmptyState title="Ei vielä asiakkaita">
        Asiakkaalla on nimi, Y-tunnus, osoite, sähköposti ja puhelin. Haku,
        lisäys, muokkaus ja poisto tulevat tähän. Tietoja ei vielä tallenneta.
      </EmptyState>
    </div>
  );
}
