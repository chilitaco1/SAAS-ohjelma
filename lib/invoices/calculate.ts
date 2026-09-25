import { VAT_RATES, type VatRate } from "@/lib/invoices/types";

/**
 * Money math for invoice rows.
 *
 * JavaScript's normal numbers cannot add 0.10 and 0.20 reliably, so this
 * file never multiplies decimal euros together. Amounts are integer cents.
 * Quantities are integer thousandths (3 decimal places). VAT percent is
 * integer basis points (25.5% → 2550). The final division uses half-up
 * rounding, which is the same rule PostgreSQL `round(numeric, 2)` uses.
 */

const MONEY_SCALE = 2;
const QUANTITY_SCALE = 3;

export type CalculatedLine = {
  description: string;
  quantityScaled: number;
  unitPriceCents: number;
  vatRate: VatRate;
  /** Veroton rivisumma, in cents. */
  subtotalCents: number;
  /** ALV for this row, in cents. Rounded on the row, then summed. */
  vatCents: number;
  /** Verollinen rivisumma, in cents. */
  totalCents: number;
};

export type VatBracket = {
  vatRate: VatRate;
  subtotalCents: number;
  vatCents: number;
};

export type InvoiceTotals = {
  lines: CalculatedLine[];
  /** One entry per VAT rate that actually appears on the invoice. */
  brackets: VatBracket[];
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
};

/** Divide a positive integer and round halves away from zero (half up). */
function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / BigInt(2)) / denominator;
}

/**
 * Parse a Finnish or international decimal ("1,5" or "1.5") into an integer
 * scaled by 10^scale. Extra digits are rounded half up. Empty input is null.
 */
export function parseDecimalToScaled(input: string, scale: number): number | null {
  const trimmed = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!trimmed) {
    return null;
  }
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return null;
  }

  const [whole, fraction = ""] = trimmed.split(".");
  const kept = fraction.slice(0, scale).padEnd(scale, "0");
  const roundDigit = fraction.length > scale ? Number(fraction[scale]) : 0;
  let scaled = Number(whole) * 10 ** scale + Number(kept);

  if (roundDigit >= 5) {
    scaled += 1;
  }

  if (!Number.isSafeInteger(scaled)) {
    return null;
  }

  return scaled;
}

export function parseMoneyToCents(input: string): number | null {
  return parseDecimalToScaled(input, MONEY_SCALE);
}

export function parseQuantity(input: string): number | null {
  return parseDecimalToScaled(input, QUANTITY_SCALE);
}

/** "10.00" or "1.500" — always a dot, for the database `numeric` columns. */
export function scaledToDecimal(scaled: number, scale: number): string {
  const factor = 10 ** scale;
  const whole = Math.floor(Math.abs(scaled) / factor);
  const fraction = String(Math.abs(scaled) % factor).padStart(scale, "0");
  const sign = scaled < 0 ? "-" : "";
  return `${sign}${whole}.${fraction}`;
}

export function centsToDecimal(cents: number): string {
  return scaledToDecimal(cents, MONEY_SCALE);
}

/** Price field text, Finnish comma, always two decimals. */
export function centsToInput(cents: number): string {
  return centsToDecimal(cents).replace(".", ",");
}

/** Quantity field text, Finnish comma, trailing zeros removed. */
export function quantityToInput(scaled: number): string {
  return scaledToDecimal(scaled, QUANTITY_SCALE)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "")
    .replace(".", ",");
}

/**
 * Read a numeric column that may arrive as a decimal string or as a JSON
 * number, and turn it back into scaled integer units.
 */
export function decimalToScaled(value: string | number, scale: number): number {
  if (typeof value === "number") {
    return parseDecimalToScaled(value.toFixed(scale), scale) ?? 0;
  }
  return parseDecimalToScaled(value, scale) ?? 0;
}

/** Line amounts from already-parsed integers. */
export function calculateLine(
  quantityScaled: number,
  unitPriceCents: number,
  vatRate: VatRate,
): Pick<CalculatedLine, "subtotalCents" | "vatCents" | "totalCents"> {
  // Thousandths × cents → cents. 1.500 × €10.00 = 1500 × 1000 / 1000 = 1500 cents.
  const subtotalCents = Number(
    divRoundHalfUp(BigInt(quantityScaled) * BigInt(unitPriceCents), BigInt(1000)),
  );
  // 25.5% is 2550 / 10000. 14% is 1400 / 10000.
  const basisPoints = BigInt(Math.round(Number(vatRate) * 100));
  const vatCents = Number(
    divRoundHalfUp(BigInt(subtotalCents) * basisPoints, BigInt(10000)),
  );

  return {
    subtotalCents,
    vatCents,
    totalCents: subtotalCents + vatCents,
  };
}

export function isVatRate(value: string): value is VatRate {
  return (VAT_RATES as readonly string[]).includes(value);
}

/**
 * Totals for the form and for the values we send to the database.
 * VAT in the summary is the sum of each row's already-rounded VAT, grouped
 * by rate, so the bracket lines add up to the invoice total exactly.
 */
export function summarizeLines(
  rows: Array<{
    description: string;
    quantityScaled: number;
    unitPriceCents: number;
    vatRate: VatRate;
  }>,
): InvoiceTotals {
  const lines: CalculatedLine[] = rows.map((row) => ({
    description: row.description,
    quantityScaled: row.quantityScaled,
    unitPriceCents: row.unitPriceCents,
    vatRate: row.vatRate,
    ...calculateLine(row.quantityScaled, row.unitPriceCents, row.vatRate),
  }));

  const bracketMap = new Map<VatRate, VatBracket>();
  for (const line of lines) {
    const current = bracketMap.get(line.vatRate) ?? {
      vatRate: line.vatRate,
      subtotalCents: 0,
      vatCents: 0,
    };
    current.subtotalCents += line.subtotalCents;
    current.vatCents += line.vatCents;
    bracketMap.set(line.vatRate, current);
  }

  const brackets = VAT_RATES.flatMap((rate) => {
    const bracket = bracketMap.get(rate);
    return bracket ? [bracket] : [];
  });

  const subtotalCents = lines.reduce((sum, line) => sum + line.subtotalCents, 0);
  const vatCents = lines.reduce((sum, line) => sum + line.vatCents, 0);

  return {
    lines,
    brackets,
    subtotalCents,
    vatCents,
    totalCents: subtotalCents + vatCents,
  };
}

/** Calendar date in Finland, as YYYY-MM-DD. Used as the default invoice date. */
export function todayInHelsinki(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Helsinki",
  }).format(new Date());
}

/** Add whole days to a YYYY-MM-DD date without shifting across time zones. */
export function addDays(isoDate: string, days: number): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    return null;
  }

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatFinnishDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    return isoDate;
  }

  return new Intl.DateTimeFormat("fi-FI", {
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
}
