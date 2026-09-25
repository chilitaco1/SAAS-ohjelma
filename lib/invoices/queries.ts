import { createClient } from "@/lib/supabase/server";
import type {
  CompanySettings,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  InvoiceWithItems,
} from "@/lib/invoices/types";

/**
 * Reads invoices for the signed-in user.
 * Row Level Security already hides everyone else's rows. These helpers only
 * shape the response and notice when the tables have not been created yet.
 */

export type InvoiceListItem = Pick<
  Invoice,
  | "id"
  | "invoice_number"
  | "status"
  | "issue_date"
  | "due_date"
  | "customer_name"
  | "total_including_vat"
  | "created_at"
>;

export type InvoiceListResult =
  | { ok: true; invoices: InvoiceListItem[] }
  | { ok: false; reason: "missing-table" | "error" };

function asDecimal(value: unknown): string {
  if (typeof value === "number") {
    return value.toString();
  }
  if (typeof value === "string") {
    return value;
  }
  return "0";
}

function asText(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return null;
}

function isMissingTable(message: string, code?: string): boolean {
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    /schema cache|does not exist|could not find the table/i.test(message)
  );
}

function toListItem(row: Record<string, unknown>): InvoiceListItem {
  return {
    id: String(row.id),
    invoice_number: asText(row.invoice_number),
    status: row.status as InvoiceStatus,
    issue_date: asText(row.issue_date),
    due_date: asText(row.due_date),
    customer_name: asText(row.customer_name),
    total_including_vat: asDecimal(row.total_including_vat),
    created_at: String(row.created_at),
  };
}

export async function listInvoices(): Promise<InvoiceListResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, status, issue_date, due_date, customer_name, total_including_vat, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      reason: isMissingTable(error.message, error.code) ? "missing-table" : "error",
    };
  }

  return {
    ok: true,
    invoices: (data ?? []).map((row) => toListItem(row as Record<string, unknown>)),
  };
}

export async function getInvoice(id: string): Promise<InvoiceWithItems | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as Record<string, unknown>;
  const items = Array.isArray(row.invoice_items) ? row.invoice_items : [];

  const invoice: InvoiceWithItems = {
    id: String(row.id),
    user_id: String(row.user_id),
    invoice_number: asText(row.invoice_number),
    status: row.status as InvoiceStatus,
    issue_date: asText(row.issue_date),
    due_date: asText(row.due_date),
    payment_terms_days:
      typeof row.payment_terms_days === "number" ? row.payment_terms_days : null,
    interest_rate: row.interest_rate === null || row.interest_rate === undefined
      ? null
      : asDecimal(row.interest_rate),
    delivery_date: asText(row.delivery_date),
    customer_name: asText(row.customer_name),
    customer_y_tunus: asText(row.customer_y_tunus),
    customer_address: asText(row.customer_address),
    customer_email: asText(row.customer_email),
    reference_number: asText(row.reference_number),
    subtotal_excluding_vat: asDecimal(row.subtotal_excluding_vat),
    total_including_vat: asDecimal(row.total_including_vat),
    seller_company_name: asText(row.seller_company_name),
    seller_y_tunus: asText(row.seller_y_tunus),
    seller_iban: asText(row.seller_iban),
    seller_bic_swift: asText(row.seller_bic_swift),
    seller_billing_address: asText(row.seller_billing_address),
    created_at: String(row.created_at),
    invoice_items: items.map((item) => {
      const line = item as Record<string, unknown>;
      return {
        id: String(line.id),
        invoice_id: String(line.invoice_id),
        description: String(line.description ?? ""),
        position: Number(line.position),
        quantity: asDecimal(line.quantity),
        unit: typeof line.unit === "string" && line.unit.length > 0 ? line.unit : "kpl",
        unit_price: asDecimal(line.unit_price),
        vat_percentage: asDecimal(line.vat_percentage),
        line_subtotal: asDecimal(line.line_subtotal),
        line_total: asDecimal(line.line_total),
      } satisfies InvoiceItem;
    }),
  };

  return invoice;
}

function toCompanySettings(row: Record<string, unknown>): CompanySettings {
  return {
    user_id: String(row.user_id),
    company_name: asText(row.company_name),
    y_tunus: asText(row.y_tunus),
    iban: asText(row.iban),
    bic_swift: asText(row.bic_swift),
    billing_address: asText(row.billing_address),
  };
}

/** The signed-in user's company row, or null if it has not been saved yet. */
export async function getCompanySettings(): Promise<CompanySettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_settings")
    .select("user_id, company_name, y_tunus, iban, bic_swift, billing_address")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toCompanySettings(data as Record<string, unknown>);
}

/**
 * Seller block for an issued invoice. Prefer the copy stored on the invoice.
 * If that copy is missing, use the current company settings.
 */
export function sellerForInvoice(
  invoice: Invoice,
  company: CompanySettings | null,
): CompanySettings {
  if (invoice.seller_company_name) {
    return {
      user_id: invoice.user_id,
      company_name: invoice.seller_company_name,
      y_tunus: invoice.seller_y_tunus,
      iban: invoice.seller_iban,
      bic_swift: invoice.seller_bic_swift,
      billing_address: invoice.seller_billing_address,
    };
  }

  return (
    company ?? {
      user_id: invoice.user_id,
      company_name: null,
      y_tunus: null,
      iban: null,
      bic_swift: null,
      billing_address: null,
    }
  );
}
