import type { VatRate } from "@/lib/invoices/types";

/** A buyer saved for reuse. The invoice stores its own copy of these details. */
export type Customer = {
  id: string;
  name: string;
  business_id: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
};

/** A product or service. Price is integer cents, excluding VAT. */
export type Product = {
  id: string;
  name: string;
  description: string | null;
  unit_price_cents: number;
  vat_rate: VatRate;
  unit: string;
};

export type CatalogList<T> = {
  items: T[];
  /** True when the Supabase table has not been created yet. */
  missing: boolean;
};
