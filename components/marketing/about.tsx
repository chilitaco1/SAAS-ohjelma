export function About() {
  return (
    <section
      id="tietoa-meista"
      className="scroll-mt-20 px-4 pb-20 md:px-8 md:pb-28"
    >
      <div className="mx-auto max-w-5xl">
        <h2 className="text-2xl font-semibold tracking-tight">Tietoa Selkosta</h2>
        <div className="mt-4 max-w-2xl space-y-4 text-sm leading-7 text-muted-foreground md:text-base">
          <p>
            Selko on suomalaisille yksinyrittäjille ja pienyrityksille suunniteltu
            yksinkertainen työkalu laskutukseen ja yrityksen arjen hallintaan.
          </p>
          <p>
            Tavoitteena on tehdä yrityksen perusasioista selkeitä ja vähentää
            turhaa hallinnollista säätöä.
          </p>
        </div>
      </div>
    </section>
  );
}
