import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { AccountActions, DeleteAccountNotice } from "@/components/settings/settings-actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Asetukset",
};

/**
 * Billing is not connected yet. A future payment provider can replace this
 * with the real plan, price, status, next charge, and customer-portal URL.
 * Selko does not store card details.
 */
function getBillingSubscription(): null {
  return null;
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? "";
  const subscription = getBillingSubscription();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Asetukset"
        description="Tili ja tilaus."
      />

      <section className="rounded-xl bg-card px-5 py-5 ring-1 ring-foreground/10">
        <h2 className="text-base font-medium">Tili</h2>
        <dl className="mt-4 text-sm">
          <dt className="text-muted-foreground">Sähköposti</dt>
          <dd className="mt-0.5 break-all font-medium">
            {email || "Sähköpostia ei saatu haettua."}
          </dd>
        </dl>
        <div className="mt-5">
          <AccountActions />
        </div>
      </section>

      <section className="rounded-xl bg-card px-5 py-5 ring-1 ring-foreground/10">
        <h2 className="text-base font-medium">Tilaus ja maksaminen</h2>
        {subscription ? null : (
          <div className="mt-4 flex flex-col gap-4">
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Selko-tilausta ei ole vielä kytketty maksunvälittäjään. Kun tilaus on
              käytössä, näet täällä suunnitelman, kuukausihinnan ja seuraavan
              veloituksen. Hallinnoi tilausta avaa silloin maksunvälittäjän
              asiakasportaalin. Maksukorttia ei tallenneta Selkoon.
            </p>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 w-fit px-4 text-base"
              disabled
            >
              Hallinnoi tilausta
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-xl bg-card px-5 py-5 ring-1 ring-foreground/10">
        <h2 className="text-base font-medium">Poista tili</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Tilin poistaminen poistaa Selko-tilisi ja siihen liittyvät tiedot.
        </p>
        <div className="mt-4">
          <DeleteAccountNotice />
        </div>
      </section>
    </div>
  );
}
