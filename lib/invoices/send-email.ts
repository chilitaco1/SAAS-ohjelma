import { createElement, type ReactElement } from "react";

import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { Resend } from "resend";

import { InvoicePdf } from "@/components/invoices/invoice-pdf";
import { decimalToScaled, formatFinnishDate } from "@/lib/invoices/calculate";
import { invoiceToPdfModel } from "@/lib/invoices/pdf-model";
import { getCompanySettings, getInvoice, sellerForInvoice } from "@/lib/invoices/queries";
import { createClient } from "@/lib/supabase/server";
import { formatEuro } from "@/lib/money";

/** Resend's shared test address until a custom domain is verified. */
const FROM_ADDRESS = "onboarding@resend.dev";

export type EmailSendResult =
  | { ok: true; stored: boolean }
  | { ok: false; reason: "missing-email"; customerId: string | null }
  | { ok: false; reason: "error"; message: string };

function finnishSendError(message: string): string {
  if (/only send testing emails to your own|verify a domain|not verified/i.test(message)) {
    return "Sähköpostia ei lähetetty. Ilman vahvistettua domainia Resend sallii testissä lähetyksen vain oman Resend-tilisi sähköpostiosoitteeseen.";
  }
  if (/api key|unauthorized|invalid api|missing api/i.test(message)) {
    return "Sähköpostin lähetys epäonnistui. Tarkista RESEND_API_KEY tiedostossa .env.local ja käynnistä kehityspalvelin uudelleen.";
  }
  const cleaned = message.replace(/re_[A-Za-z0-9_]+/g, "").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "Sähköpostin lähetys epäonnistui.";
  }
  return `Sähköpostin lähetys epäonnistui. ${cleaned.slice(0, 180)}`;
}

function fromHeader(companyName: string): string {
  const name = companyName.replace(/[\r\n]/g, " ").trim() || "Lasku";
  const quoted = `"${name.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  return `${quoted} <${FROM_ADDRESS}>`;
}

/**
 * Emails the published invoice PDF. A missing address or a Resend error
 * does not change the invoice number. The caller decides what to show.
 */
export async function sendInvoiceEmail(invoiceId: string): Promise<EmailSendResult> {
  try {
    return await deliverInvoiceEmail(invoiceId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return { ok: false, reason: "error", message: finnishSendError(message) };
  }
}

async function deliverInvoiceEmail(invoiceId: string): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey || apiKey === "I'll paste this in myself") {
    return {
      ok: false,
      reason: "error",
      message:
        "Sähköpostin lähetys epäonnistui. Lisää RESEND_API_KEY tiedostoon .env.local ja käynnistä kehityspalvelin uudelleen.",
    };
  }

  const invoice = await getInvoice(invoiceId);
  if (!invoice || invoice.status === "draft" || !invoice.invoice_number) {
    return { ok: false, reason: "error", message: "Julkaistua laskua ei löytynyt." };
  }

  const supabase = await createClient();
  let email: string | null = null;
  if (invoice.customer_id) {
    const { data } = await supabase
      .from("customers")
      .select("email")
      .eq("id", invoice.customer_id)
      .maybeSingle();
    email = typeof data?.email === "string" ? data.email.trim() : "";
    if (!email) {
      return { ok: false, reason: "missing-email", customerId: invoice.customer_id };
    }
  } else {
    email = invoice.customer_email?.trim() || null;
    if (!email) {
      return { ok: false, reason: "missing-email", customerId: null };
    }
  }

  const company = await getCompanySettings();
  const seller = sellerForInvoice(invoice, company);
  const companyName = company?.company_name?.trim() || seller.company_name?.trim() || "Lasku";
  const model = invoiceToPdfModel(invoice, seller, company?.vat_registered !== false);
  const pdf = await renderToBuffer(
    createElement(InvoicePdf, { model }) as ReactElement<DocumentProps>,
  );

  const amount = formatEuro(decimalToScaled(invoice.total_including_vat, 2));
  const due = invoice.due_date ? formatFinnishDate(invoice.due_date) : "—";
  const number = invoice.invoice_number;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: fromHeader(companyName),
    to: [email],
    subject: `Lasku ${number} - ${companyName}`,
    text: [
      "Hei,",
      "",
      `liitteenä on lasku ${number}.`,
      "",
      `Summa: ${amount}`,
      `Eräpäivä: ${due}`,
      "",
      "PDF on tämän viestin liitteenä.",
      "",
      "Ystävällisin terveisin",
      companyName,
    ].join("\n"),
    attachments: [
      {
        filename: model.filename,
        content: Buffer.from(pdf),
      },
    ],
  });

  if (error) {
    return { ok: false, reason: "error", message: finnishSendError(error.message) };
  }

  const { error: recordError } = await supabase.rpc("record_invoice_email_sent", {
    p_id: invoiceId,
  });

  if (recordError) {
    return { ok: true, stored: false };
  }

  return { ok: true, stored: true };
}
