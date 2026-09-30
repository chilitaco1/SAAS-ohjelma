"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { todayInHelsinki } from "@/lib/invoices/calculate";
import { sendInvoiceEmail, type EmailSendResult } from "@/lib/invoices/send-email";
import {
  finnishJoin,
  missingCustomerFields,
  missingSellerFields,
} from "@/lib/invoices/publish-requirements";
import { getCompanySettings } from "@/lib/invoices/queries";
import type { InvoiceFormInput, InvoiceRowForm } from "@/lib/invoices/validate";
import { parseInvoiceForm } from "@/lib/invoices/validate";

export type InvoiceActionState = {
  error?: string;
};

const SETUP_HINT =
  "Laskutauluja ei ole vielä luotu. Avaa Supabase → SQL Editor ja aja tiedosto supabase/migrations/20260925160000_create_invoices.sql.";

function friendlyError(message: string | undefined): string {
  if (!message) {
    return "Tallennus epäonnistui.";
  }
  if (/customer_id|p_customer_id/i.test(message) && /schema cache|could not find the function|does not exist|column/i.test(message)) {
    return "Laskun asiakasviite puuttuu tietokannasta. Avaa Supabase → SQL Editor ja aja tiedosto supabase/migrations/20260927220000_invoice_customer_id.sql.";
  }
  if (/record_invoice_email_sent|email_sent_at/i.test(message)) {
    return "Lähetysaika puuttuu tietokannasta. Avaa Supabase → SQL Editor ja aja tiedosto supabase/migrations/20260928233000_invoice_email.sql.";
  }
  if (/mark_invoice_paid|unmark_invoice_paid|cancel_invoice|paid_at|cancelled_at/i.test(message)) {
    return "Maksu- ja peruutustiedot puuttuvat tietokannasta. Avaa Supabase → SQL Editor ja aja tiedosto supabase/migrations/20260928120000_invoice_status.sql.";
  }
  if (/schema cache|does not exist|could not find the function|could not find the table/i.test(message)) {
    return SETUP_HINT;
  }
  return message;
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readRows(formData: FormData): InvoiceRowForm[] {
  const rows: InvoiceRowForm[] = [];

  for (let index = 0; index < 100; index += 1) {
    const description = formData.get(`rows.${index}.description`);
    const quantity = formData.get(`rows.${index}.quantity`);
    if (description === null && quantity === null) {
      break;
    }

    rows.push({
      description: typeof description === "string" ? description : "",
      quantity: typeof quantity === "string" ? quantity : "",
      unit: readText(formData, `rows.${index}.unit`) || "kpl",
      unitPrice: readText(formData, `rows.${index}.unitPrice`),
      vatPercentage: readText(formData, `rows.${index}.vatPercentage`) || "25.5",
    });
  }

  return rows;
}

function readForm(formData: FormData): InvoiceFormInput {
  return {
    issueDate: readText(formData, "issueDate"),
    paymentTermsDays: readText(formData, "paymentTermsDays"),
    deliveryDate: readText(formData, "deliveryDate"),
    interestRate: readText(formData, "interestRate"),
    customerName: readText(formData, "customerName"),
    customerId: readText(formData, "customerId").trim(),
    customerBusinessId: readText(formData, "customerBusinessId"),
    customerAddress: readText(formData, "customerAddress"),
    customerEmail: readText(formData, "customerEmail"),
    referenceNumber: readText(formData, "referenceNumber"),
    rows: readRows(formData),
  };
}

/**
 * Saves a draft, then publishes it when the user asked for a number.
 * Publishing is a second database call. If it fails, the draft is kept and
 * no invoice number is consumed.
 */
export async function saveInvoice(
  _previous: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  const parsed = parseInvoiceForm(readForm(formData));
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const idValue = readText(formData, "id");
  const intent = readText(formData, "intent") === "publish" ? "publish" : "draft";
  const draft = parsed.draft;

  const { data: savedId, error: saveError } = await supabase.rpc("save_invoice_draft", {
    p_id: idValue || null,
    p_issue_date: draft.issueDate,
    p_due_date: draft.dueDate,
    p_payment_terms_days: draft.paymentTermsDays,
    p_interest_rate: draft.interestRate,
    p_delivery_date: draft.deliveryDate,
    p_customer_name: draft.customerName,
    p_customer_y_tunus: draft.customerBusinessId,
    p_customer_address: draft.customerAddress,
    p_customer_email: draft.customerEmail,
    p_reference_number: draft.referenceNumber,
    p_items: draft.items,
    p_customer_id: draft.customerId,
  });

  if (saveError || typeof savedId !== "string") {
    return { error: friendlyError(saveError?.message) };
  }

  if (intent === "publish") {
    if (parsed.publishError) {
      redirect(`/laskut/${savedId}?error=${encodeURIComponent(parsed.publishError)}`);
    }

    const blocked = await publishBlockers(supabase, draft.customerId);
    if (blocked) {
      const params = new URLSearchParams({ error: blocked.message });
      blocked.links.forEach((link, index) => {
        params.set(index === 0 ? "link" : "link2", link);
      });
      redirect(`/laskut/${savedId}?${params.toString()}`);
    }

    const { error: publishError } = await supabase.rpc("publish_invoice", {
      p_id: savedId,
    });

    if (publishError) {
      redirect(
        `/laskut/${savedId}?error=${encodeURIComponent(friendlyError(publishError.message))}`,
      );
    }

    redirect(invoiceEmailLocation(savedId, { published: "1" }, await sendInvoiceEmail(savedId)));
  }

  redirect(`/laskut/${savedId}?saved=1`);
}

type InvoiceClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Legal details that a draft may omit, but a published invoice may not.
 * Returns a Finnish message and at most two in-app links.
 */
async function publishBlockers(
  supabase: InvoiceClient,
  customerId: string | null,
): Promise<{ message: string; links: string[] } | null> {
  const parts: string[] = [];
  const links: string[] = [];

  if (customerId) {
    const { data, error } = await supabase
      .from("customers")
      .select("name, address, postal_code, city")
      .eq("id", customerId)
      .maybeSingle();

    if (error || !data) {
      parts.push("Asiakasta ei löydy. Valitse asiakas uudelleen.");
    } else {
      const missing = missingCustomerFields(data);
      if (missing.length > 0) {
        parts.push(
          `Asiakkaalta puuttuu ${finnishJoin(missing)}. Täydennä tiedot ennen julkaisua.`,
        );
        links.push(`/asiakkaat?muokkaa=${customerId}`);
      }
    }
  }

  const sellerMissing = missingSellerFields(await getCompanySettings());
  if (sellerMissing.length > 0) {
    parts.push(
      `Yrityksen tiedoista puuttuu ${finnishJoin(sellerMissing)}. Täydennä ne Yritys-sivulla ennen julkaisua.`,
    );
    links.push("/yritys");
  }

  if (parts.length === 0) {
    return null;
  }

  return { message: parts.join(" "), links: links.slice(0, 2) };
}

async function requireInvoiceUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return supabase;
}

function readInvoiceId(formData: FormData): string {
  const id = readText(formData, "id").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    redirect("/laskut");
  }
  return id;
}

/** Records payment. Does not change amounts, dates, or the invoice number. */
export async function markInvoicePaid(formData: FormData) {
  const id = readInvoiceId(formData);
  const paidAt = readText(formData, "paidAt").trim() || todayInHelsinki();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt)) {
    redirect(`/laskut/${id}?error=${encodeURIComponent("Anna maksupäivä.")}`);
  }

  const supabase = await requireInvoiceUser();
  const { error } = await supabase.rpc("mark_invoice_paid", {
    p_id: id,
    p_paid_at: paidAt,
  });
  if (error) {
    redirect(`/laskut/${id}?error=${encodeURIComponent(friendlyError(error.message))}`);
  }

  redirect(`/laskut/${id}?paid=1`);
}

/** Puts a paid invoice back to sent and clears the payment date. */
export async function unmarkInvoicePaid(formData: FormData) {
  const id = readInvoiceId(formData);
  const supabase = await requireInvoiceUser();
  const { error } = await supabase.rpc("unmark_invoice_paid", { p_id: id });
  if (error) {
    redirect(`/laskut/${id}?error=${encodeURIComponent(friendlyError(error.message))}`);
  }

  redirect(`/laskut/${id}?unpaid=1`);
}

function invoiceEmailLocation(
  id: string,
  base: Record<string, string>,
  result: EmailSendResult,
): string {
  const params = new URLSearchParams(base);
  if (!result.ok && result.reason === "missing-email") {
    params.set("emailMissing", "1");
    if (result.customerId) {
      params.set("link", `/asiakkaat?muokkaa=${result.customerId}`);
    }
  } else if (!result.ok) {
    params.set("emailError", result.message);
  } else if (!result.stored) {
    params.set("emailStored", "0");
  } else {
    params.set("emailed", "1");
  }
  return `/laskut/${id}?${params.toString()}`;
}

/** Sends the published PDF again. Does not change the invoice number or status. */
export async function resendInvoiceEmail(formData: FormData) {
  const id = readInvoiceId(formData);
  await requireInvoiceUser();
  redirect(invoiceEmailLocation(id, {}, await sendInvoiceEmail(id)));
}

/**
 * Deletes one draft. Lines go first, while the draft row still exists, so the
 * line lock can see that it is a draft. Published invoices stay.
 */
export async function deleteInvoiceDraft(formData: FormData) {
  const id = readInvoiceId(formData);
  const supabase = await requireInvoiceUser();

  const { error: itemsError } = await supabase
    .from("invoice_items")
    .delete()
    .eq("invoice_id", id);
  if (itemsError) {
    redirect(`/laskut/${id}?error=${encodeURIComponent(friendlyError(itemsError.message))}`);
  }

  const { data, error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("status", "draft")
    .select("id");

  if (error) {
    redirect(`/laskut/${id}?error=${encodeURIComponent(friendlyError(error.message))}`);
  }
  if (!data || data.length === 0) {
    redirect(
      `/laskut/${id}?error=${encodeURIComponent("Vain luonnoksen voi poistaa.")}`,
    );
  }

  redirect("/laskut");
}

/** Cancels a sent invoice. The row and its number stay. */
export async function cancelInvoice(formData: FormData) {
  const id = readInvoiceId(formData);
  const supabase = await requireInvoiceUser();
  const { error } = await supabase.rpc("cancel_invoice", { p_id: id });
  if (error) {
    redirect(`/laskut/${id}?error=${encodeURIComponent(friendlyError(error.message))}`);
  }

  redirect(`/laskut/${id}?canceled=1`);
}
