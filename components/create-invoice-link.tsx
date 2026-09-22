import { Plus } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CreateInvoiceLinkProps = {
  className?: string;
};

export function CreateInvoiceLink({ className }: CreateInvoiceLinkProps) {
  return (
    <Link
      href="/laskut/uusi"
      className={cn(buttonVariants({ size: "lg" }), "h-11 px-4 text-base", className)}
    >
      <Plus />
      Luo lasku
    </Link>
  );
}
