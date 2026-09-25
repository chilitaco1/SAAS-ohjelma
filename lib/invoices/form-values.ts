import {
  centsToInput,
  decimalToScaled,
  quantityToInput,
  todayInHelsinki,
} from "@/lib/invoices/calculate";
import type { InvoiceStatus, InvoiceWithItems, VatRate } from "@/lib/invoices/types";

/** Values the invoice form edits. Money is text so the inputs can show commas. */
export type InvoiceFormValues = {
  id: string | null;
  status: InvoiceStatus | null;
  invoiceNumber: string | null;
  referenceNumber: string;
  issueDate: string;
  paymentTermsDays: string;
  deliveryDate: string;
  interestRate: string;
  customerName: string;
  customerBusinessId: string;
  customerAddress: string;
  customerEmail: string;
  rows: InvoiceFormRow[];
};

export type InvoiceFormRow = {
  key: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  vatPercentage: VatRate;
};

function moneyInput(value: string | number | null): string {
  if (value === null || value === "") {
    return "";
  }
  const source = typeof value === "number" ? value.toFixed(2) : value;
  return centsToInput(decimalToScaled(source, 2));
}

function quantityInput(value: string | number): string {
  const source = typeof value === "number" ? value.toFixed(3) : value;
  return quantityToInput(decimalToScaled(source, 3));
}

function vatInput(value: string | number): VatRate {
  const rate = Number(value);
  if (rate === 25.5) return "25.5";
  if (rate === 14) return "14";
  if (rate === 10) return "10";
  return "0";
}

export function blankInvoiceForm(): InvoiceFormValues {
  return {
    id: null,
    status: null,
    invoiceNumber: null,
    referenceNumber: "",
    issueDate: todayInHelsinki(),
    paymentTermsDays: "14",
    deliveryDate: "",
    interestRate: "",
    customerName: "",
    customerBusinessId: "",
    customerAddress: "",
    customerEmail: "",
    rows: [
      {
        key: crypto.randomUUID(),
        description: "",
        quantity: "",
        unit: "kpl",
        unitPrice: "",
        vatPercentage: "25.5",
      },
    ],
  };
}

export function invoiceToForm(invoice: InvoiceWithItems): InvoiceFormValues {
  const rows = [...invoice.invoice_items]
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      key: item.id,
      description: item.description,
      quantity: quantityInput(item.quantity),
      unit: item.unit || "kpl",
      unitPrice: moneyInput(item.unit_price),
      vatPercentage: vatInput(item.vat_percentage),
    }));

  return {
    id: invoice.id,
    status: invoice.status,
    invoiceNumber: invoice.invoice_number,
    referenceNumber: invoice.reference_number ?? "",
    issueDate: invoice.issue_date ?? todayInHelsinki(),
    paymentTermsDays:
      invoice.payment_terms_days === null ? "" : String(invoice.payment_terms_days),
    deliveryDate: invoice.delivery_date ?? "",
    interestRate: moneyInput(invoice.interest_rate),
    customerName: invoice.customer_name ?? "",
    customerBusinessId: invoice.customer_y_tunus ?? "",
    customerAddress: invoice.customer_address ?? "",
    customerEmail: invoice.customer_email ?? "",
    rows: rows.length > 0 ? rows : blankInvoiceForm().rows,
  };
}
