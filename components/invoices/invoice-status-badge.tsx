import { cn } from "@/lib/utils";
import { invoiceDisplayLabel, type InvoiceStatus } from "@/lib/invoices/types";

const toneClassName: Record<string, string> = {
  Luonnos: "bg-muted text-muted-foreground",
  Lähetetty: "bg-accent text-accent-foreground",
  Erääntynyt: "bg-destructive/10 text-destructive",
  Maksettu: "bg-primary/10 text-primary",
  Peruttu: "bg-muted text-foreground",
};

type InvoiceStatusBadgeProps = {
  status: InvoiceStatus;
  dueDate: string | null;
  today: string;
};

/** Stored status, except a sent invoice past its due date shows Erääntynyt. */
export function InvoiceStatusBadge({ status, dueDate, today }: InvoiceStatusBadgeProps) {
  const label = invoiceDisplayLabel(status, dueDate, today);

  return (
    <span
      className={cn(
        "inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClassName[label],
      )}
    >
      {label}
    </span>
  );
}
