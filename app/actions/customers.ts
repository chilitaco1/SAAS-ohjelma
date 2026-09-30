"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type CustomerActionState = {
  error?: string;
  success?: string;
  savedAt?: number;
};

const SETUP_HINT =
  "Asiakastaulua ei ole vielä luotu. Avaa Supabase → SQL Editor ja aja tiedosto supabase/migrations/20260927200000_customers_products.sql.";

const BUSINESS_ID = /^\d{7}-\d$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  if (/schema cache|does not exist|could not find the table|customers_business_id/i.test(message)) {
    if (/customers_business_id/i.test(message)) {
      return "Y-tunnuksen muoto on 1234567-8.";
    }
    return SETUP_HINT;
  }
  return message;
}

function readCustomer(formData: FormData) {
  const name = readText(formData, "name");
  const businessId = readText(formData, "businessId");
  const email = readText(formData, "email");
  const phone = readText(formData, "phone");

  const address = readText(formData, "address");
  const postalCode = readText(formData, "postalCode");
  const city = readText(formData, "city");

  if (!name || name.length > 200) {
    return { error: "Anna asiakkaan nimi." } as const;
  }
  if (!address) {
    return { error: "Anna katuosoite." } as const;
  }
  if (!postalCode) {
    return { error: "Anna postinumero." } as const;
  }
  if (!city) {
    return { error: "Anna postitoimipaikka." } as const;
  }
  if (businessId && !BUSINESS_ID.test(businessId)) {
    return { error: "Y-tunnuksen muoto on 1234567-8." } as const;
  }
  if (email && !EMAIL.test(email)) {
    return { error: "Sähköpostiosoite ei ole kelvollinen." } as const;
  }
  if (phone.length > 40) {
    return { error: "Puhelinnumero on liian pitkä." } as const;
  }

  return {
    row: {
      name,
      business_id: emptyToNull(businessId),
      address: address,
      postal_code: postalCode,
      city,
      country: readText(formData, "country") || "Suomi",
      email: emptyToNull(email),
      phone: emptyToNull(phone),
    },
  } as const;
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
  revalidatePath("/asiakkaat");
  revalidatePath("/laskut", "layout");
}

/** Creates or updates one customer owned by the signed-in user. */
export async function saveCustomer(
  _previous: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const parsed = readCustomer(formData);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const id = readText(formData, "id");
  const { supabase, user } = await requireUser();

  if (id) {
    const { error } = await supabase
      .from("customers")
      .update(parsed.row)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      return { error: friendlyError(error.message) };
    }
  } else {
    const { error } = await supabase.from("customers").insert({
      ...parsed.row,
      user_id: user.id,
    });
    if (error) {
      return { error: friendlyError(error.message) };
    }
  }

  refresh();
  return { success: "Asiakas tallennettiin.", savedAt: Date.now() };
}

/** Deletes one of the signed-in user's customers. Sent invoices keep their own copy. */
export async function deleteCustomer(
  _previous: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const id = readText(formData, "id");
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return { error: "Asiakasta ei löytynyt." };
  }

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");
  if (error) {
    if (/foreign key|23503/i.test(error.message)) {
      return {
        error:
          "Asiakasta ei poistettu. Tietokannan viite laskuun estää poiston. Laskun oma kopio nimestä ja osoitteesta säilyy.",
      };
    }
    return { error: friendlyError(error.message) };
  }
  if (!data || data.length === 0) {
    return {
      error:
        "Asiakasta ei poistettu. Poisto-oikeus puuttuu tai asiakas on jo poistettu. Avaa Supabase → SQL Editor ja aja tiedosto supabase/migrations/20260927200000_customers_products.sql, jos poisto-oikeutta ei ole vielä luotu.",
    };
  }

  refresh();
  return { success: "Asiakas poistettiin.", savedAt: Date.now() };
}
