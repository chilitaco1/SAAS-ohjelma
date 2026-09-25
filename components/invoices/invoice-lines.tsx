"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  centsToDecimal,
  isVatRate,
  parseMoneyToCents,
  parseQuantity,
  summarizeLines,
} from "@/lib/invoices/calculate";
import type { InvoiceFormRow } from "@/lib/invoices/form-values";
import { INVOICE_UNITS, VAT_RATES, type VatRate } from "@/lib/invoices/types";
import { formatEuro } from "@/lib/money";
import { cn } from "@/lib/utils";

const fieldClassName = cn(
  "h-10 w-full min-w-0 rounded-lg border border-border bg-background px-2 text-sm text-foreground",
  "outline-none placeholder:text-muted-foreground",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

const vatLabels: Record<VatRate, string> = {
  "25.5": "25,5 %",
  "14": "14 %",
  "10": "10 %",
  "0": "0 %",
};

type InvoiceLinesProps = {
  /** Current rows. The parent owns this state so a draft can be saved. */
  rows: InvoiceFormRow[];
  /**
   * Issued invoices are read-only. Finnish bookkeeping does not allow
   * changing lines after the invoice number has been given.
   */
  readOnly: boolean;
  onChange?: (rows: InvoiceFormRow[]) => void;
};

function blankRow(): InvoiceFormRow {
  return {
    key: crypto.randomUUID(),
    description: "",
    quantity: "",
    unit: "kpl",
    unitPrice: "",
    vatPercentage: "25.5",
  };
}

function rowIsBlank(row: InvoiceFormRow): boolean {
  return row.description.trim() === "" && row.quantity.trim() === "" && row.unitPrice.trim() === "";
}

/**
 * Invoice lines and the Finnish VAT summary.
 * Amounts are integer cents, so 0,10 € + 0,20 € stays 0,30 €.
 * The row total is quantity × unit price, excluding VAT.
 * The card on the right groups that VAT by rate and adds the grand total.
 */
export function InvoiceLines({ rows, readOnly, onChange }: InvoiceLinesProps) {
  const preview = useMemo(() => {
    const complete = rows.flatMap((row) => {
      if (rowIsBlank(row)) {
        return [];
      }
      const quantityScaled = parseQuantity(row.quantity);
      const unitPriceCents = parseMoneyToCents(row.unitPrice);
      if (
        quantityScaled === null ||
        quantityScaled <= 0 ||
        unitPriceCents === null ||
        !isVatRate(row.vatPercentage)
      ) {
        return [];
      }
      return [
        {
          description: row.description,
          quantityScaled,
          unitPriceCents,
          vatRate: row.vatPercentage,
        },
      ];
    });
    return summarizeLines(complete);
  }, [rows]);

  function updateRow(key: string, patch: Partial<InvoiceFormRow>) {
    onChange?.(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function removeRow(key: string) {
    const next = rows.filter((row) => row.key !== key);
    onChange?.(next.length > 0 ? next : [blankRow()]);
  }

  return (
    <section className="rounded-xl bg-card px-5 py-5 ring-1 ring-foreground/10">
      <h2 className="text-base font-medium">Laskurivit</h2>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full table-fixed border-separate border-spacing-x-1.5 text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="w-[24%] pb-2 font-medium">Kuvaus</th>
              <th className="w-[12%] pb-2 font-medium">Määrä</th>
              <th className="w-[12%] pb-2 font-medium">Yksikkö</th>
              <th className="w-[18%] pb-2 font-medium">Yksikköhinta, veroton</th>
              <th className="w-[14%] pb-2 font-medium">ALV %</th>
              <th className="w-[14%] pb-2 text-right font-medium">Rivisumma</th>
              {readOnly ? null : (
                <th className="w-[6%] pb-2">
                  <span className="sr-only">Poista</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const quantityScaled = parseQuantity(row.quantity);
              const unitPriceCents = parseMoneyToCents(row.unitPrice);
              const line =
                quantityScaled !== null && quantityScaled > 0 && unitPriceCents !== null
                  ? summarizeLines([
                      {
                        description: row.description,
                        quantityScaled,
                        unitPriceCents,
                        vatRate: isVatRate(row.vatPercentage) ? row.vatPercentage : "25.5",
                      },
                    ]).lines[0]
                  : null;

              const textCell = "px-1 py-3";

              return (
                <tr key={row.key} className={readOnly ? "border-b border-border last:border-0" : undefined}>
                  <td className={readOnly ? textCell : "py-1.5"}>
                    {readOnly ? (
                      row.description
                    ) : (
                      <>
                        <label className="sr-only" htmlFor={`description-${row.key}`}>
                          Kuvaus
                        </label>
                        <input
                          id={`description-${row.key}`}
                          name={`rows.${index}.description`}
                          value={row.description}
                          onChange={(event) => updateRow(row.key, { description: event.target.value })}
                          className={fieldClassName}
                        />
                      </>
                    )}
                  </td>
                  <td className={cn(readOnly ? textCell : "py-1.5", "text-right tabular-nums")}>
                    {readOnly ? (
                      row.quantity
                    ) : (
                      <>
                        <label className="sr-only" htmlFor={`quantity-${row.key}`}>
                          Määrä
                        </label>
                        <input
                          id={`quantity-${row.key}`}
                          name={`rows.${index}.quantity`}
                          inputMode="decimal"
                          value={row.quantity}
                          onChange={(event) => updateRow(row.key, { quantity: event.target.value })}
                          className={cn(fieldClassName, "text-right tabular-nums")}
                        />
                      </>
                    )}
                  </td>
                  <td className={readOnly ? textCell : "py-1.5"}>
                    {readOnly ? (
                      row.unit
                    ) : (
                      <>
                        <label className="sr-only" htmlFor={`unit-${row.key}`}>
                          Yksikkö
                        </label>
                        <input
                          id={`unit-${row.key}`}
                          name={`rows.${index}.unit`}
                          list="invoice-units"
                          value={row.unit}
                          onChange={(event) => updateRow(row.key, { unit: event.target.value })}
                          className={fieldClassName}
                        />
                      </>
                    )}
                  </td>
                  <td className={cn(readOnly ? textCell : "py-1.5", "text-right tabular-nums")}>
                    {readOnly ? (
                      row.unitPrice ? formatEuro(parseMoneyToCents(row.unitPrice) ?? 0) : "—"
                    ) : (
                      <>
                        <label className="sr-only" htmlFor={`price-${row.key}`}>
                          Yksikköhinta veroton
                        </label>
                        <input
                          id={`price-${row.key}`}
                          name={`rows.${index}.unitPrice`}
                          inputMode="decimal"
                          placeholder="0,00"
                          value={row.unitPrice}
                          onChange={(event) => updateRow(row.key, { unitPrice: event.target.value })}
                          className={cn(fieldClassName, "text-right tabular-nums")}
                        />
                      </>
                    )}
                  </td>
                  <td className={cn(readOnly ? textCell : "py-1.5", readOnly && "text-right tabular-nums")}>
                    {readOnly ? (
                      vatLabels[row.vatPercentage]
                    ) : (
                      <>
                        <label className="sr-only" htmlFor={`vat-${row.key}`}>
                          ALV
                        </label>
                        <select
                          id={`vat-${row.key}`}
                          name={`rows.${index}.vatPercentage`}
                          value={row.vatPercentage}
                          onChange={(event) => {
                            if (isVatRate(event.target.value)) {
                              updateRow(row.key, { vatPercentage: event.target.value });
                            }
                          }}
                          className={fieldClassName}
                        >
                          {VAT_RATES.map((rate) => (
                            <option key={rate} value={rate}>
                              {vatLabels[rate]}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </td>
                  <td className="py-1.5 text-right font-medium tabular-nums">
                    {line ? formatEuro(line.subtotalCents) : "—"}
                  </td>
                  {readOnly ? null : (
                    <td className="py-1.5 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Poista rivi"
                        onClick={() => removeRow(row.key)}
                      >
                        <Trash2 />
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        <datalist id="invoice-units">
          {INVOICE_UNITS.map((unit) => (
            <option key={unit} value={unit} />
          ))}
        </datalist>
      </div>

      {readOnly ? null : (
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={() => onChange?.([...rows, blankRow()])}
        >
          <Plus />
          Lisää rivi
        </Button>
      )}

      {/* Summary sits on the right. It updates on every keystroke from the rows above. */}
      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-sm rounded-xl bg-background px-4 py-4 ring-1 ring-foreground/10">
          <h3 className="text-sm font-medium">ALV-erittely</h3>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Veroton välisumma</span>
              <span className="tabular-nums">{formatEuro(preview.subtotalCents)}</span>
            </div>
            {preview.brackets.length === 0 ? (
              <p className="text-muted-foreground">Ei vielä laskurivejä.</p>
            ) : (
              preview.brackets.map((bracket) => (
                <div key={bracket.vatRate} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">ALV {vatLabels[bracket.vatRate]}</span>
                  <span className="tabular-nums">{formatEuro(bracket.vatCents)}</span>
                </div>
              ))
            )}
            <div className="mt-1 flex justify-between gap-4 border-t border-border pt-3 text-base font-semibold">
              <span>Laskun loppusumma yhteensä</span>
              <span className="tabular-nums">{formatEuro(preview.totalCents)}</span>
            </div>
          </div>
          <p className="sr-only" aria-live="polite">
            Laskun loppusumma {centsToDecimal(preview.totalCents)} euroa
          </p>
        </div>
      </div>
    </section>
  );
}
