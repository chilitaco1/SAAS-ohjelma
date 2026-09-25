import type { Metadata } from "next";

import { CompanyForm } from "@/components/company/company-form";
import { PageHeader } from "@/components/page-header";
import { getCompanySettings } from "@/lib/invoices/queries";

export const metadata: Metadata = {
  title: "Yritys",
};

export default async function CompanyPage() {
  const company = await getCompanySettings();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Yritys"
        description="Nämä tiedot täytetään kerran. Julkaistu lasku kopioi ne myyjän ja pankin tiedoiksi."
      />
      <div className="rounded-xl bg-card px-5 py-5 ring-1 ring-foreground/10">
        <CompanyForm company={company} />
      </div>
    </div>
  );
}
