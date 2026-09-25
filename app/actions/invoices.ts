"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
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
  });

  if (saveError || typeof savedId !== "string") {
    return { error: friendlyError(saveError?.message) };
  }

  if (intent === "publish") {
    if (parsed.publishError) {
      redirect(`/laskut/${savedId}?error=${encodeURIComponent(parsed.publishError)}`);
    }

    const { error: publishError } = await supabase.rpc("publish_invoice", {
      p_id: savedId,
    });

    if (publishError) {
      redirect(
        `/laskut/${savedId}?error=${encodeURIComponent(friendlyError(publishError.message))}`,
      );
    }

    redirect(`/laskut/${savedId}?published=1`);
  }

  redirect(`/laskut/${savedId}?saved=1`);
}

/** Records payment. Does not change amounts, dates, or the invoice number. */
export async function markInvoicePaid(formData: FormData) {
  const id = readText(formData, "id");
  if (!id) {
    redirect("/laskut");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc("mark_invoice_paid", { p_id: id });
  if (error) {
    redirect(`/laskut/${id}?error=${encodeURIComponent(friendlyError(error.message))}`);
  }

  redirect(`/laskut/${id}?paid=1`);
}
