import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LinkProps = {
  className?: string;
  size?: "default" | "lg";
};

export function StartForFreeLink({ className, size = "lg" }: LinkProps) {
  return (
    <Link
      href="/signup"
      className={cn(
        buttonVariants({ size }),
        size === "lg" && "h-11 px-4 text-base",
        className,
      )}
    >
      Aloita ilmaiseksi
    </Link>
  );
}

export function SignInLink({ className, size = "lg" }: LinkProps) {
  return (
    <Link
      href="/login"
      className={cn(
        buttonVariants({ variant: "outline", size }),
        "bg-card",
        size === "lg" && "h-11 px-4 text-base",
        className,
      )}
    >
      Kirjaudu sisään
    </Link>
  );
}
