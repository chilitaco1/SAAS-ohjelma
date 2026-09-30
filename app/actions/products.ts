"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isVatRate, parseMoneyToCents } from "@/lib/invoices/calculate";

export type ProductActionState = {
  error?: string;
  success?: string;
  savedAt?: number;
};

const SETUP_HINT =
  "Tuotetaulua ei ole vielä luotu. Avaa Supabase → SQL Editor ja aja tiedosto supabase/migrations/20260927200000_customers_products.sql.";

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

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return { supabase, user };
}

function refresh() {
  revalidatePath("/tuotteet");
  revalidatePath("/laskut", "layout");
}

/** Creates or updates one product. Existing invoice lines keep the price they copied. */
export async function saveProduct(
  _previous: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const name = readText(formData, "name");
  const unit = readText(formData, "unit") || "kpl";
  const vat = readText(formData, "vatRate");
  const priceCents = parseMoneyToCents(readText(formData, "unitPrice"));

  if (!name || name.length > 200) {
    return { error: "Anna tuotteen nimi." };
  }
  if (priceCents === null || priceCents < 0) {
    return { error: "Anna hinta ilman ALV:tä, esimerkiksi 80,00." };
  }
  if (!isVatRate(vat)) {
    return { error: "ALV-kannan pitää olla 25,5 %, 14 %, 10 % tai 0 %." };
  }
  if (!/^[\p{L}\d ./-]{1,16}$/u.test(unit)) {
    return { error: "Yksikkö on liian pitkä tai sisältää virheellisiä merkkejä." };
  }

  const row = {
    name,
    description: emptyToNull(readText(formData, "description")),
    unit_price_cents: priceCents,
    vat_rate: vat,
    unit,
  };

  const id = readText(formData, "id");
  const { supabase, user } = await requireUser();

  if (id) {
    const { error } = await supabase
      .from("products")
      .update(row)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      return { error: friendlyError(error.message) };
    }
  } else {
    const { error } = await supabase.from("products").insert({
      ...row,
      user_id: user.id,
    });
    if (error) {
      return { error: friendlyError(error.message) };
    }
  }

  refresh();
  return { success: "Tuote tallennettiin.", savedAt: Date.now() };
}

/** Deletes one product. Invoice lines already copied its price, so they stay as they were. */
export async function deleteProduct(
  _previous: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const id = readText(formData, "id");
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return { error: "Tuotetta ei löytynyt." };
  }

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");
  if (error) {
    if (/foreign key|23503/i.test(error.message)) {
      return {
        error:
          "Tuotetta ei poistettu. Tietokannan viite laskuriviin estää poiston. Laskurivi säilyttää oman kopionsa nimestä ja hinnasta.",
      };
    }
    return { error: friendlyError(error.message) };
  }
  if (!data || data.length === 0) {
    return {
      error:
        "Tuotetta ei poistettu. Poisto-oikeus puuttuu tai tuote on jo poistettu. Avaa Supabase → SQL Editor ja aja tiedosto supabase/migrations/20260927200000_customers_products.sql, jos poisto-oikeutta ei ole vielä luotu.",
    };
  }

  refresh();
  return { success: "Tuote poistettiin.", savedAt: Date.now() };
}
