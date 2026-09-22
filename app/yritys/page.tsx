import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Yritys",
};

const fields = [
  "Yrityksen nimi",
  "Y-tunnus",
  "Osoite, postinumero, kaupunki ja maa",
  "Sähköposti ja puhelin",
  "IBAN",
  "Verkkosivu",
  "Logo",
  "Onko yritys ALV-velvollinen",
];

export default function CompanyPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Yritys"
        description="Nämä tiedot täytetään kerran. Lasku käyttää niitä automaattisesti."
      />
      <div className="rounded-xl bg-card px-5 py-5 ring-1 ring-foreground/10">
        <h2 className="text-base font-medium">Lomakkeeseen tulee</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
          {fields.map((field) => (
            <li key={field}>{field}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Yhdellä käyttäjällä on yksi yritys. Jos ALV-velvollisuus on päällä,
          tuotteiden oletusverokanta on 25,5 %. Tietoja ei vielä tallenneta.
        </p>
      </div>
    </div>
  );
}
