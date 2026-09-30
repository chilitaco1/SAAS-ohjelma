"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  centsToDecimal,
  centsToInput,
  isVatRate,
  parseMoneyToCents,
  parseQuantity,
  summarizeLines,
} from "@/lib/invoices/calculate";
import type { Product } from "@/lib/catalog/types";
import type { InvoiceFormRow } from "@/lib/invoices/form-values";
import { INVOICE_UNITS, VAT_RATES, type VatRate } from "@/lib/invoices/types";
import { formatEuro } from "@/lib/money";
import { cn } from "@/lib/utils";

const fieldClassName = cn(
  "h-10 w-full min-w-0 rounded-md border border-border/80 bg-card px-2.5 text-sm text-foreground",
  "outline-none placeholder:text-muted-foreground",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

const rowGrid =
  "lg:grid lg:grid-cols-[minmax(0,1fr)_3.5rem_4rem_6.75rem_4.75rem_7rem_2.25rem] lg:items-center lg:gap-x-3";

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
  /**
   * Saved products. Choosing one copies the current name, price, VAT and unit
   * onto the row. The invoice does not keep a link back to the product.
   */
  products?: Product[];
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
export function InvoiceLines({ rows, readOnly, onChange, products = [] }: InvoiceLinesProps) {
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

  function applyProduct(key: string, productId: string) {
    const product = products.find((item) => item.id === productId);
    if (!product || !isVatRate(product.vat_rate)) {
      updateRow(key, { productId: undefined });
      return;
    }
    const current = rows.find((row) => row.key === key);
    updateRow(key, {
      productId: product.id,
      description: product.description ? `${product.name}\n${product.description}` : product.name,
      unit: product.unit,
      unitPrice: centsToInput(product.unit_price_cents),
      vatPercentage: product.vat_rate,
      quantity: current?.quantity.trim() ? current.quantity : "1",
    });
  }

  function removeRow(key: string) {
    const next = rows.filter((row) => row.key !== key);
    onChange?.(next.length > 0 ? next : [blankRow()]);
  }

  function addSavedProduct(productId: string) {
    const blank = rows.find(rowIsBlank);
    if (blank) {
      applyProduct(blank.key, productId);
      return;
    }
    const product = products.find((item) => item.id === productId);
    if (!product || !isVatRate(product.vat_rate)) {
      return;
    }
    onChange?.([
      ...rows,
      {
        key: crypto.randomUUID(),
        productId: product.id,
        description: product.description ? `${product.name}\n${product.description}` : product.name,
        quantity: "1",
        unit: product.unit,
        unitPrice: centsToInput(product.unit_price_cents),
        vatPercentage: product.vat_rate,
      },
    ]);
  }

  const grid = readOnly
    ? "lg:grid lg:grid-cols-[minmax(0,1fr)_3.5rem_4rem_6.75rem_4.75rem_7rem] lg:items-center lg:gap-x-3"
    : rowGrid;
  const hasBillableLines = preview.brackets.length > 0;

  return (
    <section className="rounded-xl bg-card px-5 py-5 ring-1 ring-foreground/10">
      <h2 className="text-base font-medium">Laskurivit</h2>

      <div className={cn(grid, "mt-4 hidden px-1 text-xs font-medium text-muted-foreground lg:grid")}>
        <span className="px-2.5">Kuvaus</span>
        <span className="px-1 text-right">Määrä</span>
        <span className="px-1" title="Yksikkö">
          Yks.
        </span>
        <span className="px-2.5 text-right">Yksikköhinta</span>
        <span className="pl-2.5">ALV</span>
        <span className="text-right">Yhteensä</span>
        {readOnly ? null : <span className="sr-only">Poista</span>}
      </div>

      <div className="mt-3 flex flex-col gap-3 lg:mt-1 lg:gap-2">
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

          return (
            <div
              key={row.key}
              className={cn(
                grid,
                "rounded-lg bg-muted/40 px-3 py-3 lg:bg-transparent lg:px-1 lg:py-1",
              )}
            >
              <div className="min-w-0 overflow-hidden">
                <label htmlFor={`description-${row.key}`} className="mb-1 block text-xs text-muted-foreground lg:sr-only">
                  Kuvaus
                </label>
                {readOnly ? (
                  <p className="whitespace-pre-line text-sm">{row.description}</p>
                ) : (
                  <textarea
                    id={`description-${row.key}`}
                    name={`rows.${index}.description`}
                    rows={2}
                    value={row.description}
                    onChange={(event) => updateRow(row.key, { description: event.target.value })}
                    className={cn(fieldClassName, "h-auto min-h-10 min-w-0 max-w-full resize-none py-2 leading-5")}
                  />
                )}
              </div>
              <div>
                <label htmlFor={`quantity-${row.key}`} className="mb-1 block text-xs text-muted-foreground lg:sr-only">
                  Määrä
                </label>
                {readOnly ? (
                  <p className="text-sm tabular-nums">{row.quantity}</p>
                ) : (
                  <input
                    id={`quantity-${row.key}`}
                    name={`rows.${index}.quantity`}
                    inputMode="decimal"
                    value={row.quantity}
                    onChange={(event) => updateRow(row.key, { quantity: event.target.value })}
                    className={cn(fieldClassName, "text-right tabular-nums")}
                  />
                )}
              </div>
              <div>
                <label htmlFor={`unit-${row.key}`} className="mb-1 block text-xs text-muted-foreground lg:sr-only">
                  Yksikkö
                </label>
                {readOnly ? (
                  <p className="text-sm">{row.unit}</p>
                ) : (
                  <input
                    id={`unit-${row.key}`}
                    name={`rows.${index}.unit`}
                    list="invoice-units"
                    value={row.unit}
                    onChange={(event) => updateRow(row.key, { unit: event.target.value })}
                    className={fieldClassName}
                  />
                )}
              </div>
              <div>
                <label htmlFor={`price-${row.key}`} className="mb-1 block text-xs text-muted-foreground lg:sr-only">
                  Yksikköhinta veroton
                </label>
                {readOnly ? (
                  <p className="text-sm tabular-nums">
                    {row.unitPrice ? formatEuro(parseMoneyToCents(row.unitPrice) ?? 0) : "—"}
                  </p>
                ) : (
                  <input
                    id={`price-${row.key}`}
                    name={`rows.${index}.unitPrice`}
                    inputMode="decimal"
                    placeholder="0,00"
                    value={row.unitPrice}
                    onChange={(event) => updateRow(row.key, { unitPrice: event.target.value })}
                    className={cn(fieldClassName, "text-right tabular-nums")}
                  />
                )}
              </div>
              <div>
                <label htmlFor={`vat-${row.key}`} className="mb-1 block text-xs text-muted-foreground lg:sr-only">
                  ALV
                </label>
                {readOnly ? (
                  <p className="text-sm tabular-nums">{vatLabels[row.vatPercentage]}</p>
                ) : (
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
                )}
              </div>
              <div className="flex items-center justify-between lg:block lg:text-right">
                <span className="text-xs text-muted-foreground lg:sr-only">Yhteensä</span>
                <span className="text-sm font-medium tabular-nums">
                  {line ? formatEuro(line.subtotalCents) : "—"}
                </span>
              </div>
              {readOnly ? null : (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Poista rivi"
                    onClick={() => removeRow(row.key)}
                    className="text-muted-foreground"
                  >
                    <Trash2 />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <datalist id="invoice-units">
        {INVOICE_UNITS.map((unit) => (
          <option key={unit} value={unit} />
        ))}
      </datalist>

      {readOnly ? null : (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          {products.length > 0 ? (
            <label className="flex min-w-0 flex-col gap-1 text-sm sm:w-64">
              <span className="text-muted-foreground">Lisää tuote tai palvelu</span>
              <select
                value=""
                aria-label="Lisää tuote tai palvelu"
                onChange={(event) => {
                  if (event.target.value) {
                    addSavedProduct(event.target.value);
                  }
                }}
                className={fieldClassName}
              >
                <option value="">Valitse tuote tai palvelu</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => onChange?.([...rows, blankRow()])}
          >
            <Plus />
            Lisää laskurivi
          </Button>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-sm">
          {hasBillableLines ? (
            <>
              <h3 className="text-sm font-medium text-muted-foreground">ALV-erittely</h3>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <div className="flex justify-between gap-6">
                  <span className="text-muted-foreground">Veroton summa</span>
                  <span className="tabular-nums">{formatEuro(preview.subtotalCents)}</span>
                </div>
                {preview.brackets.map((bracket) => (
                  <div key={bracket.vatRate} className="flex justify-between gap-6">
                    <span className="text-muted-foreground">ALV {vatLabels[bracket.vatRate]}</span>
                    <span className="tabular-nums">{formatEuro(bracket.vatCents)}</span>
                  </div>
                ))}
                <div className="mt-1 flex items-baseline justify-between gap-6 border-t border-border pt-3">
                  <span className="text-sm font-medium">Laskun loppusumma</span>
                  <span className="text-2xl font-semibold tracking-tight tabular-nums">
                    {formatEuro(preview.totalCents)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-baseline justify-between gap-6 text-sm">
              <span className="text-muted-foreground">Laskun loppusumma</span>
              <span className="font-medium tabular-nums">{formatEuro(preview.totalCents)}</span>
            </div>
          )}
          <p className="sr-only" aria-live="polite">
            Laskun loppusumma {centsToDecimal(preview.totalCents)} euroa
          </p>
        </div>
      </div>
    </section>
  );
}
