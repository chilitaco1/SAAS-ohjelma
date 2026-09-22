import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Asetukset",
};

const settings = [
  "Oletusmaksuehto, esimerkiksi 14 päivää",
  "Oletusteksti laskun lisätietoihin",
  "Uloskirjautuminen, kun kirjautuminen on olemassa",
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Asetukset"
        description="Tänne tulevat oletukset, jotka toistuvat laskusta toiseen."
      />
      <div className="rounded-xl bg-card px-5 py-5 ring-1 ring-foreground/10">
        <h2 className="text-base font-medium">Myöhemmin tällä sivulla</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
          {settings.map((setting) => (
            <li key={setting}>{setting}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Asetuksia ei voi vielä muuttaa, koska mitään ei tallenneta.
        </p>
      </div>
    </div>
  );
}
