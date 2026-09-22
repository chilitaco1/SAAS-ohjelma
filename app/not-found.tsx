import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex max-w-lg flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Sivua ei löydy</h1>
      <p className="text-sm leading-6 text-muted-foreground">
        Tarkista osoite tai palaa etusivulle.
      </p>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        Etusivulle
      </Link>
    </div>
  );
}
