import { StartForFreeLink, SignInLink } from "@/components/marketing/actions";
import { APP_NAME } from "@/lib/brand";
import { formatEuro } from "@/lib/money";

export function Hero() {
  return (
    <section className="px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="max-w-xl">
          <h1 className="text-4xl font-semibold tracking-tight text-balance text-foreground md:text-5xl">
            Laskutus ilman turhaa säätöä
          </h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground md:text-lg">
            Selko tekee laskutuksesta ja yrityksen arjen hallinnasta
            yksinkertaista. Luo laskut, hallitse asiakkaita ja pidä ALV-laskenta
            helposti mukana.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <StartForFreeLink />
            <SignInLink />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="flex min-h-64">
            <div className="hidden w-36 shrink-0 flex-col gap-1 bg-sidebar p-4 text-sm text-sidebar-foreground sm:flex">
              <p className="mb-3 font-semibold">{APP_NAME}</p>
              <p className="rounded-lg bg-sidebar-accent px-2 py-1.5 text-sidebar-accent-foreground">
                Etusivu
              </p>
              <p className="px-2 py-1.5 text-sidebar-foreground/75">Laskut</p>
              <p className="px-2 py-1.5 text-sidebar-foreground/75">Asiakkaat</p>
            </div>
            <div className="flex flex-1 flex-col justify-center p-5 sm:p-6">
              <p className="text-sm text-muted-foreground">Laskutettu tässä kuussa</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                {formatEuro(125_000)}
              </p>
              <div className="mt-5 rounded-lg border border-border px-3 py-3">
                <div className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium">INV-1001</p>
                    <p className="text-muted-foreground">Mäkinen Oy</p>
                  </div>
                  <p className="font-medium tabular-nums">{formatEuro(125_000)}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Esimerkki näkymästä</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
