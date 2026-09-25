"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type CompanyActionState = {
  error?: string;
  success?: string;
};

const SETUP_HINT =
  "Yritystaulua ei ole vielä luotu. Avaa Supabase → SQL Editor ja aja tiedosto supabase/migrations/20260925180000_company_settings.sql.";

const BUSINESS_ID = /^\d{7}-\d$/;
const IBAN = /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/;
const BIC = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function emptyToNull(value: string): string | null {
  return value ? value : null;
}

function friendlyError(message: string | undefined): string {
  if (!message) {
    return "Tallennus epäonnistui.";
  }
  if (/schema cache|does not exist|could not find the table/i.test(message)) {
    return SETUP_HINT;
  }
  return message;
}

/** Saves the seller details that a Finnish invoice must show. */
export async function saveCompanySettings(
  _previous: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  const companyName = readText(formData, "companyName");
  const businessId = readText(formData, "businessId");
  const iban = readText(formData, "iban").replace(/\s/g, "").toUpperCase();
  const bic = readText(formData, "bic").replace(/\s/g, "").toUpperCase();
  const billingAddress = readText(formData, "billingAddress");

  if (!companyName) {
    return { error: "Anna yrityksen nimi." };
  }
  if (businessId && !BUSINESS_ID.test(businessId)) {
    return { error: "Y-tunnuksen muoto on 1234567-8." };
  }
  if (iban && !IBAN.test(iban)) {
    return { error: "IBAN ei ole kelvollinen." };
  }
  if (bic && !BIC.test(bic)) {
    return { error: "BIC / SWIFT ei ole kelvollinen." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("company_settings").upsert(
    {
      user_id: user.id,
      company_name: companyName,
      y_tunus: emptyToNull(businessId),
      iban: emptyToNull(iban),
      bic_swift: emptyToNull(bic),
      billing_address: emptyToNull(billingAddress),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return { error: friendlyError(error.message) };
  }

  // Freeze these details onto issued invoices that do not have a seller copy yet.
  await supabase.rpc("attach_seller_snapshot");

  return { success: "Yritystiedot tallennettiin. Uudet laskut käyttävät niitä." };
}
