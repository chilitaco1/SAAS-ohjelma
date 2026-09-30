import type { CompanySettings } from "@/lib/invoices/types";

/** "katuosoite ja postinumero", or three items with a comma and "ja". */
export function finnishJoin(items: string[]): string {
  if (items.length <= 1) {
    return items[0] ?? "";
  }
  return `${items.slice(0, -1).join(", ")} ja ${items[items.length - 1]}`;
}

export function missingCustomerFields(customer: {
  name: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
}): string[] {
  const missing: string[] = [];
  if (!customer.name?.trim()) {
    missing.push("nimi");
  }
  if (!customer.address?.trim()) {
    missing.push("katuosoite");
  }
  if (!customer.postal_code?.trim()) {
    missing.push("postinumero");
  }
  if (!customer.city?.trim()) {
    missing.push("postitoimipaikka");
  }
  return missing;
}

export function missingSellerFields(company: CompanySettings | null): string[] {
  const missing: string[] = [];
  if (!company?.company_name?.trim()) {
    missing.push("yrityksen nimi");
  }
  if (!company?.y_tunus?.trim()) {
    missing.push("Y-tunnus");
  }
  if (!company?.billing_address?.trim()) {
    missing.push("osoite");
  }
  if (!company?.iban?.trim()) {
    missing.push("IBAN");
  }
  return missing;
}
