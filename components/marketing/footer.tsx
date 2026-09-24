import Link from "next/link";

import { APP_NAME } from "@/lib/brand";

const links = [
  { href: "/#hinnasto", label: "Hinnasto" },
  { href: "/#tietoa-meista", label: "Tietoa meistä" },
  { href: "/login", label: "Kirjaudu sisään" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between md:px-8">
        <p className="text-sm text-muted-foreground">
          © 2026 {APP_NAME}. Kaikki oikeudet pidätetään.
        </p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Alatunniste">
          {links.map((link) =>
            link.href.startsWith("/") && !link.href.includes("#") ? (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {link.label}
              </a>
            ),
          )}
        </nav>
      </div>
    </footer>
  );
}
