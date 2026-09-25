import {
  centsToDecimal,
  isVatRate,
  parseMoneyToCents,
  parseQuantity,
  scaledToDecimal,
  summarizeLines,
  addDays,
  type InvoiceTotals,
} from "@/lib/invoices/calculate";
import { isValidFinnishReference } from "@/lib/invoices/reference";
import type { VatRate } from "@/lib/invoices/types";

/**
 * Turns the form's text fields into the exact decimals stored in Supabase.
 * The database trigger calculates the official cents again, so a modified
 * browser request cannot store a different total than these inputs produce.
 */

export type InvoiceRowForm = {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  vatPercentage: string;
};

export type InvoiceFormInput = {
  issueDate: string;
  paymentTermsDays: string;
  deliveryDate: string;
  interestRate: string;
  customerName: string;
  customerBusinessId: string;
  customerAddress: string;
  customerEmail: string;
  referenceNumber: string;
  rows: InvoiceRowForm[];
};

export type DraftItemPayload = {
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  vat_percentage: string;
};

export type DraftPayload = {
  issueDate: string | null;
  dueDate: string | null;
  paymentTermsDays: number | null;
  interestRate: string | null;
  deliveryDate: string | null;
  customerName: string | null;
  customerBusinessId: string | null;
  customerAddress: string | null;
  customerEmail: string | null;
  referenceNumber: string | null;
  items: DraftItemPayload[];
  totals: InvoiceTotals;
};

export type ParsedInvoiceForm =
  | { ok: true; draft: DraftPayload; publishError: string | null }
  | { ok: false; error: string };

const BUSINESS_ID = /^\d{7}-\d$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function rowIsBlank(row: InvoiceRowForm): boolean {
  return (
    row.description.trim() === "" &&
    row.quantity.trim() === "" &&
    row.unitPrice.trim() === ""
  );
}

/**
 * Validate a draft loosely enough that an unfinished invoice can be saved,
 * and separately collect the reason it cannot be published yet.
 */
export function parseInvoiceForm(input: InvoiceFormInput): ParsedInvoiceForm {
  const issueDate = emptyToNull(input.issueDate);
  if (issueDate && !/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) {
    return { ok: false, error: "Laskun päivä ei ole kelvollinen." };
  }

  let paymentTermsDays: number | null = null;
  const termsText = input.paymentTermsDays.trim();
  if (termsText) {
    if (!/^\d{1,3}$/.test(termsText)) {
      return { ok: false, error: "Maksuehdon pitää olla kokonaisluku, esimerkiksi 14." };
    }
    paymentTermsDays = Number(termsText);
    if (paymentTermsDays > 365) {
      return { ok: false, error: "Maksuehto voi olla enintään 365 päivää." };
    }
  }

  const dueDate =
    issueDate && paymentTermsDays !== null ? addDays(issueDate, paymentTermsDays) : null;
  if (issueDate && paymentTermsDays !== null && !dueDate) {
    return { ok: false, error: "Eräpäivää ei voitu laskea." };
  }

  const deliveryDate = emptyToNull(input.deliveryDate);
  if (deliveryDate && !/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) {
    return { ok: false, error: "Toimituspäivä ei ole kelvollinen." };
  }

  let interestRate: string | null = null;
  const interestText = input.interestRate.trim();
  if (interestText) {
    const interestCents = parseMoneyToCents(interestText);
    if (interestCents === null || interestCents > 10000) {
      return { ok: false, error: "Viivästyskorko ei ole kelvollinen prosentti." };
    }
    interestRate = centsToDecimal(interestCents);
  }

  const customerBusinessId = emptyToNull(input.customerBusinessId);
  if (customerBusinessId && !BUSINESS_ID.test(customerBusinessId)) {
    return { ok: false, error: "Y-tunnuksen muoto on 1234567-8." };
  }

  const customerEmail = emptyToNull(input.customerEmail);
  if (customerEmail && !EMAIL.test(customerEmail)) {
    return { ok: false, error: "Sähköpostiosoite ei ole kelvollinen." };
  }

  const referenceRaw = input.referenceNumber.trim();
  if (referenceRaw && !isValidFinnishReference(referenceRaw)) {
    return {
      ok: false,
      error: "Viitenumero ei täsmää. Jätä kenttä tyhjäksi, niin se lasketaan laskunumerosta.",
    };
  }

  const filledRows = input.rows.filter((row) => !rowIsBlank(row));
  if (filledRows.length > 100) {
    return { ok: false, error: "Laskussa voi olla enintään 100 riviä." };
  }

  const parsedRows: Array<{
    description: string;
    quantityScaled: number;
    unitPriceCents: number;
    vatRate: VatRate;
    unit: string;
  }> = [];

  for (const row of filledRows) {
    const description = row.description.trim();
    if (!description) {
      return { ok: false, error: "Jokaisella laskurivillä pitää olla kuvaus." };
    }
    if (description.length > 500) {
      return { ok: false, error: "Rivin kuvaus on liian pitkä." };
    }

    const quantityScaled = parseQuantity(row.quantity);
    if (quantityScaled === null || quantityScaled <= 0 || quantityScaled > 100_000_000) {
      return { ok: false, error: "Määrän pitää olla suurempi kuin 0." };
    }

    const unitPriceCents = parseMoneyToCents(row.unitPrice);
    if (unitPriceCents === null || unitPriceCents > 100_000_000_00) {
      return { ok: false, error: "Á-hinta ei ole kelvollinen." };
    }

    if (!isVatRate(row.vatPercentage)) {
      return { ok: false, error: "ALV-kannan pitää olla 25,5 %, 14 %, 10 % tai 0 %." };
    }

    const unit = row.unit.trim();
    if (unit && !/^[\p{L}\d ./-]{1,16}$/u.test(unit)) {
      return { ok: false, error: "Yksikkö on liian pitkä tai sisältää virheellisiä merkkejä." };
    }

    parsedRows.push({
      description,
      quantityScaled,
      unitPriceCents,
      vatRate: row.vatPercentage,
      unit: unit || "kpl",
    });
  }

  const totals = summarizeLines(parsedRows);
  const publishProblems: string[] = [];

  if (!issueDate) {
    publishProblems.push("lisää laskun päivä");
  }
  if (paymentTermsDays === null) {
    publishProblems.push("lisää maksuehto");
  }
  if (interestRate === null) {
    publishProblems.push("lisää viivästyskorko (0 jos et peri korkoa)");
  }
  if (!emptyToNull(input.customerName)) {
    publishProblems.push("lisää asiakkaan nimi");
  }
  if (parsedRows.length === 0) {
    publishProblems.push("lisää vähintään yksi laskurivi");
  }

  return {
    ok: true,
    draft: {
      issueDate,
      dueDate,
      paymentTermsDays,
      interestRate,
      deliveryDate,
      customerName: emptyToNull(input.customerName),
      customerBusinessId,
      customerAddress: emptyToNull(input.customerAddress),
      customerEmail,
      referenceNumber: referenceRaw ? referenceRaw.replace(/\s/g, "") : null,
      items: parsedRows.map((row) => ({
        description: row.description,
        quantity: scaledToDecimal(row.quantityScaled, 3),
        unit: row.unit,
        unit_price: centsToDecimal(row.unitPriceCents),
        vat_percentage: row.vatRate,
      })),
      totals,
    },
    publishError:
      publishProblems.length > 0
        ? `Ennen julkaisua: ${publishProblems.join(", ")}.`
        : null,
  };
}
