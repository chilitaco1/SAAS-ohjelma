import type { Metadata } from "next";

import { CustomerManager } from "@/components/customers/customer-manager";
import { PageHeader } from "@/components/page-header";
import { listCustomers } from "@/lib/catalog/queries";

export const metadata: Metadata = {
  title: "Asiakkaat",
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ muokkaa?: string }>;
}) {
  const customers = await listCustomers();
  const query = await searchParams;
  const editingId =
    query.muokkaa && /^[0-9a-f-]{36}$/i.test(query.muokkaa) ? query.muokkaa : undefined;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Asiakkaat"
        description="Tänne tallennat yritykset ja ihmiset, joille lähetät laskuja."
      />
      <CustomerManager
        customers={customers.items}
        missing={customers.missing}
        editingId={editingId}
      />
    </div>
  );
}
