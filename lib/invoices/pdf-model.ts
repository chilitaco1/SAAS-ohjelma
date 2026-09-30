import { decimalToScaled, formatFinnishDate, quantityToInput } from "@/lib/invoices/calculate";
import { formatReferenceNumber } from "@/lib/invoices/reference";
import type { CompanySettings, InvoiceWithItems } from "@/lib/invoices/types";
import { formatEuro } from "@/lib/money";

/**
 * Text for the PDF. Every amount and date is taken from the stored invoice.
 * VAT lines are the stored line total minus the stored line subtotal, grouped
 * by the stored rate. Nothing is priced again from the products table.
 */

export type InvoicePdfLine = {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  vat: string;
  total: string;
};

export type InvoicePdfVatRow = {
  label: string;
  amount: string;
};

export type InvoicePdfModel = {
  filename: string;
  sellerName: string;
  sellerLines: string[];
  vatRegistered: boolean;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  paymentTerms: string;
  deliveryDate: string | null;
  referenceNumber: string;
  interestRate: string | null;
  customerLines: string[];
  lines: InvoicePdfLine[];
  subtotal: string;
  vatRows: InvoicePdfVatRow[];
  total: string;
  iban: string | null;
  bic: string | null;
  /** True when the stored status is canceled. The PDF still downloads. */
  cancelled: boolean;
};

function money(value: string): string {
  return formatEuro(decimalToScaled(value, 2));
}

function formatVatRate(value: string): string {
  if (Number(value) === 25.5) {
    return "25,5 %";
  }
  return `${value.replace(".", ",")} %`;
}

function formatInterest(value: string): string {
  return `${value.replace(".", ",")} %`;
}

function formatIban(value: string): string {
  return value.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim();
}

const vatOrder = [25.5, 14, 10, 0];

export function invoiceToPdfModel(
  invoice: InvoiceWithItems,
  seller: CompanySettings,
  vatRegistered: boolean,
): InvoicePdfModel {
  const items = [...invoice.invoice_items].sort((a, b) => a.position - b.position);
  const vatCents = new Map<number, number>();

  for (const item of items) {
    const rate = Number(item.vat_percentage);
    const tax = decimalToScaled(item.line_total, 2) - decimalToScaled(item.line_subtotal, 2);
    vatCents.set(rate, (vatCents.get(rate) ?? 0) + tax);
  }

  const vatRows = [...vatCents.entries()]
    .sort((a, b) => {
      const aIndex = vatOrder.indexOf(a[0]);
      const bIndex = vatOrder.indexOf(b[0]);
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    })
    .map(([rate, cents]) => ({
      label: `ALV ${formatVatRate(String(rate))}`,
      amount: formatEuro(cents),
    }));

  const sellerLines = [
    seller.y_tunus ? `Y-tunnus ${seller.y_tunus}` : null,
    seller.billing_address,
    seller.iban ? `IBAN ${formatIban(seller.iban)}` : null,
    seller.bic_swift ? `BIC ${seller.bic_swift}` : null,
  ].filter((line): line is string => Boolean(line));

  const customerLines = [
    invoice.customer_name,
    invoice.customer_y_tunus ? `Y-tunnus ${invoice.customer_y_tunus}` : null,
    invoice.customer_address,
    invoice.customer_email,
  ].filter((line): line is string => Boolean(line));

  const number = invoice.invoice_number ?? "lasku";

  return {
    filename: `${number.replace(/[^\w.-]+/g, "")}.pdf`,
    sellerName: seller.company_name ?? "Myyjä",
    sellerLines,
    vatRegistered,
    invoiceNumber: number,
    issueDate: invoice.issue_date ? formatFinnishDate(invoice.issue_date) : "—",
    dueDate: invoice.due_date ? formatFinnishDate(invoice.due_date) : "—",
    paymentTerms:
      invoice.payment_terms_days === null ? "—" : `${invoice.payment_terms_days} päivää`,
    deliveryDate: invoice.delivery_date ? formatFinnishDate(invoice.delivery_date) : null,
    referenceNumber: invoice.reference_number
      ? formatReferenceNumber(invoice.reference_number)
      : "—",
    interestRate: invoice.interest_rate ? formatInterest(invoice.interest_rate) : null,
    customerLines: customerLines.length > 0 ? customerLines : ["—"],
    lines: items.map((item) => ({
      description: item.description,
      quantity: quantityToInput(decimalToScaled(item.quantity, 3)),
      unit: item.unit,
      unitPrice: money(item.unit_price),
      vat: formatVatRate(item.vat_percentage),
      total: money(item.line_total),
    })),
    subtotal: money(invoice.subtotal_excluding_vat),
    vatRows,
    total: money(invoice.total_including_vat),
    iban: seller.iban ? formatIban(seller.iban) : null,
    bic: seller.bic_swift,
    cancelled: invoice.status === "canceled",
  };
}
