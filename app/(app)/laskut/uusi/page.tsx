import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Uusi lasku",
};

const futureFields = [
  "Asiakas",
  "Laskurivit: tuote, kuvaus, määrä, yksikkö, á-hinta ja ALV",
  "Laskun päivä ja eräpäivä",
  "Maksuehto, viitenumero ja lisätiedot",
  "Automaattiset summat: veroton, ALV ja yhteensä",
];

export default function NewInvoicePage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Uusi lasku"
        description="Tästä syntyy lasku, kun tallennus on rakennettu. Tässä versiossa mitään ei vielä tallenneta."
      />

      <div className="rounded-xl bg-card px-5 py-5 ring-1 ring-foreground/10">
        <h2 className="text-base font-medium">Lomakkeeseen tulee</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
          {futureFields.map((field) => (
            <li key={field}>{field}</li>
          ))}
        </ol>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Laskunumero, esimerkiksi INV-1001, annetaan vasta kun lasku merkitään
          lähetetyksi. Kotimainen viitenumero lasketaan samasta numerosta.
        </p>
      </div>

      <Link href="/laskut" className={buttonVariants({ variant: "outline" })}>
        Takaisin laskuihin
      </Link>
    </div>
  );
}
