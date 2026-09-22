import { CreateInvoiceLink } from "@/components/create-invoice-link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatEuro } from "@/lib/money";

const stats = [
  {
    label: "Laskutettu tässä kuussa",
    value: formatEuro(0),
    hint: "Lähetetyt ja maksetut laskut",
  },
  {
    label: "Avoimet laskut",
    value: "0",
    hint: "Lähetetty, ei vielä maksettu",
  },
  {
    label: "Erääntyneet",
    value: "0",
    hint: "Lähetetty lasku, jonka eräpäivä on mennyt",
  },
  {
    label: "Maksetut",
    value: "0",
    hint: "Merkitty maksetuiksi",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Etusivu"
        description="Tästä näet kuukauden laskutuksen yhdellä silmäyksellä."
        action={<CreateInvoiceLink />}
      />

      <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm leading-6 text-muted-foreground">
        Tämä on ensimmäinen versio. Valikko toimii. Laskuja, asiakkaita ja
        kirjautumista ei vielä tallenneta, joten luvut alla ovat nollia.
      </p>

      <section aria-label="Yhteenveto" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-semibold tracking-tight tabular-nums">
                {stat.value}
              </p>
            </CardHeader>
            <CardContent className="text-xs leading-5 text-muted-foreground">
              {stat.hint}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">Viimeisimmät laskut</h2>
        <EmptyState title="Ei vielä laskuja">
          Kun lähetät laskun, se näkyy tässä. Numero, esimerkiksi INV-1001,
          annetaan vasta lähetyshetkellä.
        </EmptyState>
      </section>
    </div>
  );
}
