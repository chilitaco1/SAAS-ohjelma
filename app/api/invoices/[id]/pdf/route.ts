import { createElement, type ReactElement } from "react";

import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { InvoicePdf } from "@/components/invoices/invoice-pdf";
import { invoiceToPdfModel } from "@/lib/invoices/pdf-model";
import { getCompanySettings, getInvoice, sellerForInvoice } from "@/lib/invoices/queries";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PdfRouteProps = {
  params: Promise<{ id: string }>;
};

/** Download one published invoice. Drafts have no number or reference yet. */
export async function GET(_request: Request, { params }: PdfRouteProps) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new NextResponse("Laskua ei löytynyt.", { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Kirjaudu sisään.", { status: 401 });
  }

  const invoice = await getInvoice(id);
  if (!invoice || invoice.status === "draft" || !invoice.invoice_number) {
    return new NextResponse("Julkaistua laskua ei löytynyt.", { status: 404 });
  }

  const company = await getCompanySettings();
  const seller = sellerForInvoice(invoice, company);
  const model = invoiceToPdfModel(invoice, seller, company?.vat_registered !== false);
  const pdf = await renderToBuffer(
    createElement(InvoicePdf, { model }) as ReactElement<DocumentProps>,
  );

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${model.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
