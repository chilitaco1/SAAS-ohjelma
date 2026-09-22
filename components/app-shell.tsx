"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { APP_NAME } from "@/lib/brand";
import { isNavItemActive, navItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function BrandLink({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onNavigate}
      className="flex items-center gap-2 rounded-lg px-2 py-1 font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      <span className="flex size-8 items-center justify-center rounded-md bg-sidebar-accent text-sm text-sidebar-accent-foreground">
        S
      </span>
      {APP_NAME}
    </Link>
  );
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {navItems.map((item) => {
        const active = isNavItemActive(pathname, item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="px-4 py-5">
          <BrandLink />
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Päävalikko">
          <NavLinks pathname={pathname} />
        </nav>
        <p className="px-6 pb-6 text-xs leading-5 text-sidebar-foreground/70">
          Kirjautuminen lisätään seuraavaksi.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={
                <Button variant="outline" size="icon" aria-label="Avaa valikko" />
              }
            >
              <Menu />
            </SheetTrigger>
            <SheetContent
              side="left"
              showCloseButton={false}
              className="w-72 border-sidebar-border bg-sidebar text-sidebar-foreground"
            >
              <div className="flex items-center justify-between px-4 pt-4">
                <SheetTitle className="text-sidebar-foreground">
                  <BrandLink onNavigate={closeMenu} />
                </SheetTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  onClick={closeMenu}
                >
                  <X />
                  <span className="sr-only">Sulje valikko</span>
                </Button>
              </div>
              <nav className="flex flex-col gap-1 px-3" aria-label="Päävalikko">
                <NavLinks pathname={pathname} onNavigate={closeMenu} />
              </nav>
            </SheetContent>
          </Sheet>
          <span className="font-semibold tracking-tight">{APP_NAME}</span>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
