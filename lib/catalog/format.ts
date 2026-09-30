import type { Customer } from "@/lib/catalog/types";

/** Street, postal code and city, then country. Empty parts are left out. */
export function formatCustomerAddress(customer: Pick<
  Customer,
  "address" | "postal_code" | "city" | "country"
>): string {
  const cityLine = [customer.postal_code, customer.city].filter(Boolean).join(" ");
  return [customer.address, cityLine, customer.country]
    .map((part) => part?.trim() ?? "")
    .filter((part) => part.length > 0)
    .join("\n");
}
