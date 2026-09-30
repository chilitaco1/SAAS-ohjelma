import { createClient } from "@/lib/supabase/server";
import { isVatRate } from "@/lib/invoices/calculate";
import type { Customer, CatalogList, Product } from "@/lib/catalog/types";

function isMissingTable(message: string, code?: string): boolean {
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    /schema cache|does not exist|could not find the table/i.test(message)
  );
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toCustomer(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    business_id: asText(row.business_id),
    address: asText(row.address),
    postal_code: asText(row.postal_code),
    city: asText(row.city),
    country: asText(row.country),
    email: asText(row.email),
    phone: asText(row.phone),
  };
}

function toProduct(row: Record<string, unknown>): Product | null {
  const vat = String(row.vat_rate ?? "");
  const normalized = vat === "25.50" ? "25.5" : vat.replace(/\.0$/, "");
  if (!isVatRate(normalized)) {
    return null;
  }
  const cents = Number(row.unit_price_cents);
  if (!Number.isInteger(cents) || cents < 0) {
    return null;
  }
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    description: asText(row.description),
    unit_price_cents: cents,
    vat_rate: normalized,
    unit: typeof row.unit === "string" && row.unit.length > 0 ? row.unit : "kpl",
  };
}

export async function listCustomers(): Promise<CatalogList<Customer>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, business_id, address, postal_code, city, country, email, phone")
    .order("name", { ascending: true });

  if (error) {
    return { items: [], missing: isMissingTable(error.message, error.code) };
  }

  return {
    items: (data ?? []).map((row) => toCustomer(row as Record<string, unknown>)),
    missing: false,
  };
}

export async function listProducts(): Promise<CatalogList<Product>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, unit_price_cents, vat_rate, unit")
    .order("name", { ascending: true });

  if (error) {
    return { items: [], missing: isMissingTable(error.message, error.code) };
  }

  return {
    items: (data ?? []).flatMap((row) => {
      const product = toProduct(row as Record<string, unknown>);
      return product ? [product] : [];
    }),
    missing: false,
  };
}
