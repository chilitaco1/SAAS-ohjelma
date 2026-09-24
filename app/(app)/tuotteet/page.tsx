import type { Metadata } from "next";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatEuro } from "@/lib/money";

export const metadata: Metadata = {
  title: "Tuotteet",
};

const examples = [
  { name: "Konsultointi", price: formatEuro(8000), unit: "tunti", vat: "25,5 %" },
  { name: "Verkkosivut", price: formatEuro(120_000), unit: "kpl", vat: "25,5 %" },
  { name: "Ylläpito", price: formatEuro(10_000), unit: "kk", vat: "25,5 %" },
];

export default function ProductsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Tuotteet"
        description="Tänne tallennat tuotteet ja palvelut, joita käytät uudelleen laskuriveillä."
      />
      <EmptyState title="Ei vielä tuotteita">
        Tuotteella on nimi, kuvaus, hinta ilman ALV:tä, ALV-prosentti ja
        yksikkö. Kun lisäät tuotteen laskulle, lasku muistaa sen hetkisen
        hinnan, vaikka muuttaisit tuotetta myöhemmin.
      </EmptyState>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-medium">Esimerkkejä</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Näitä ei ole tallennettu. Ne näyttävät, miltä tuote tulee
            näyttämään.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {examples.map((example) => (
            <Card key={example.name}>
              <CardHeader>
                <p className="font-medium">{example.name}</p>
                <p className="text-lg font-semibold tabular-nums">
                  {example.price}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / {example.unit}
                  </span>
                </p>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                ALV {example.vat}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
