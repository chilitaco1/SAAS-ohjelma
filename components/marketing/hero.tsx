import { StartForFreeLink, SignInLink } from "@/components/marketing/actions";
import { Card, CardHeader } from "@/components/ui/card";
import { APP_NAME } from "@/lib/brand";
import { formatEuro } from "@/lib/money";

const previewStats = [
  { label: "Laskutettu tässä kuussa", value: formatEuro(0) },
  { label: "Avoimet laskut", value: "0" },
];

export function Hero() {
  return (
    <section className="px-4 py-12 md:px-8 md:py-16">
      <div className="mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-12">
        <div className="max-w-xl">
          <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground md:text-4xl">
            Laskutus ilman turhaa säätöä
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">
            Selko tekee laskutuksesta ja yrityksen arjen hallinnasta
            yksinkertaista. Luo laskut, hallitse asiakkaita ja pidä ALV-laskenta
            helposti mukana.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <StartForFreeLink />
            <SignInLink />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl bg-background ring-1 ring-foreground/10">
          <div className="flex">
            <div className="hidden w-40 shrink-0 flex-col gap-1 bg-sidebar p-3 text-sm text-sidebar-foreground sm:flex">
              <p className="mb-2 flex items-center gap-2 px-2 font-semibold">
                <span className="flex size-6 items-center justify-center rounded-md bg-sidebar-accent text-xs text-sidebar-accent-foreground">
                  S
                </span>
                {APP_NAME}
              </p>
              <p className="rounded-lg bg-sidebar-accent px-3 py-2 text-sidebar-accent-foreground">
                Etusivu
              </p>
              <p className="px-3 py-2 text-sidebar-foreground/80">Laskut</p>
              <p className="px-3 py-2 text-sidebar-foreground/80">Asiakkaat</p>
            </div>
            <div className="min-w-0 flex-1 p-4">
              <p className="text-sm font-medium">Etusivu</p>
              <div className="mt-3 grid gap-3">
                {previewStats.map((stat) => (
                  <Card key={stat.label}>
                    <CardHeader>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-semibold tracking-tight tabular-nums">
                        {stat.value}
                      </p>
                    </CardHeader>
                  </Card>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Esimerkki ohjelman näkymästä
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
