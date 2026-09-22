"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { StartForFreeLink, SignInLink } from "@/components/marketing/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

const sectionLinks = [
  { href: "/#hinnasto", label: "Hinnasto" },
  { href: "/#tietoa-meista", label: "Tietoa meistä" },
];

function Logo({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onNavigate}
      className="flex items-center gap-2 rounded-lg font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex size-8 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground">
        S
      </span>
      {APP_NAME}
    </Link>
  );
}

function SectionLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <>
      {sectionLinks.map((link) => (
        <a
          key={link.href}
          href={link.href}
          onClick={onNavigate}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
            className,
          )}
        >
          {link.label}
        </a>
      ))}
    </>
  );
}

export function MarketingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 md:px-8">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Sivun osiot">
          <SectionLinks />
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <SignInLink />
          <StartForFreeLink />
        </div>

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger
            aria-label="Avaa valikko"
            className={cn(
              buttonVariants({ variant: "outline", size: "icon" }),
              "md:hidden",
            )}
          >
            <Menu />
          </SheetTrigger>
          <SheetContent side="right" showCloseButton={false} className="w-72 bg-card">
            <div className="flex items-center justify-between px-4 pt-4">
              <SheetTitle>
                <Logo onNavigate={closeMenu} />
              </SheetTitle>
              <Button variant="ghost" size="icon" onClick={closeMenu}>
                <X />
                <span className="sr-only">Sulje valikko</span>
              </Button>
            </div>
            <nav className="flex flex-col gap-1 px-3" aria-label="Sivun osiot">
              <SectionLinks onNavigate={closeMenu} className="text-base" />
            </nav>
            <div className="mt-auto flex flex-col gap-2 p-4">
              <SignInLink className="w-full" />
              <StartForFreeLink className="w-full" />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
