import { FileText, Package, Percent, Users, type LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

const features: { title: string; description: string; icon: LucideIcon }[] = [
  {
    title: "Laskujen luonti",
    description: "Luo ja lähetä laskut nopeasti ilman turhaa säätöä.",
    icon: FileText,
  },
  {
    title: "Asiakkaat",
    description: "Pidä asiakkaiden tiedot helposti yhdessä paikassa.",
    icon: Users,
  },
  {
    title: "Tuotteet ja palvelut",
    description:
      "Tallenna tuotteet ja palvelut valmiiksi, jotta laskujen tekeminen on nopeaa.",
    icon: Package,
  },
  {
    title: "ALV-laskenta",
    description: "Pidä arvonlisäveron laskenta mukana laskutuksessa.",
    icon: Percent,
  },
];

export function Features() {
  return (
    <section className="px-4 pb-16 md:px-8 md:pb-24" aria-labelledby="ominaisuudet">
      <div className="mx-auto max-w-5xl">
        <h2 id="ominaisuudet" className="text-2xl font-semibold tracking-tight">
          Mitä Selko auttaa tekemään
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Card key={feature.title}>
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary">
                    <Icon />
                  </div>
                  <h3 className="text-base font-medium">{feature.title}</h3>
                </CardHeader>
                <CardContent className="text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
