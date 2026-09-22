import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LinkProps = {
  className?: string;
};

export function StartForFreeLink({ className }: LinkProps) {
  return (
    <Link
      href="/signup"
      className={cn(buttonVariants({ size: "lg" }), "h-11 px-4 text-base", className)}
    >
      Aloita ilmaiseksi
    </Link>
  );
}

export function SignInLink({ className }: LinkProps) {
  return (
    <Link
      href="/login"
      className={cn(
        buttonVariants({ variant: "outline", size: "lg" }),
        "h-11 bg-card px-4 text-base",
        className,
      )}
    >
      Kirjaudu sisään
    </Link>
  );
}
