import type { Metadata } from "next";

import { About } from "@/components/marketing/about";
import { Features } from "@/components/marketing/features";
import { Hero } from "@/components/marketing/hero";
import { Pricing } from "@/components/marketing/pricing";

export const metadata: Metadata = {
  title: "Laskutus ilman turhaa säätöä",
  description:
    "Selko tekee laskutuksesta ja yrityksen arjen hallinnasta yksinkertaista suomalaisille yksinyrittäjille ja pienyrityksille.",
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Features />
      <Pricing />
      <About />
    </>
  );
}
