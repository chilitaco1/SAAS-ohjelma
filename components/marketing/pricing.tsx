import { Card, CardContent, CardHeader } from "@/components/ui/card";

type PricingPlan = {
  name: string;
  price: string;
  description: string;
};

/** Add plan objects here when prices are decided. An empty list shows the placeholder. */
const plans: PricingPlan[] = [];

export function Pricing() {
  return (
    <section id="hinnasto" className="scroll-mt-20 px-4 py-12 md:px-8 md:py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-2xl font-semibold tracking-tight">
          Yksinkertainen hinnoittelu
        </h2>
        {plans.length === 0 ? (
          <Card className="mt-6 max-w-2xl">
            <CardHeader>
              <h3 className="text-lg font-medium">Hinnoittelu julkaistaan pian</h3>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              Selko on rakennettu niin, että hinnoittelu pysyy yksinkertaisena ja
              helposti ymmärrettävänä.
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {plans.map((plan) => (
              <Card key={plan.name}>
                <CardHeader>
                  <h3 className="text-lg font-medium">{plan.name}</h3>
                  <p className="text-2xl font-semibold tracking-tight">{plan.price}</p>
                </CardHeader>
                <CardContent className="text-sm leading-6 text-muted-foreground">
                  {plan.description}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
