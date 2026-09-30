"use client";

import { useActionState, useEffect, useState } from "react";

import { deleteProduct, saveProduct, type ProductActionState } from "@/app/actions/products";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { centsToInput } from "@/lib/invoices/calculate";
import { VAT_RATES, type VatRate } from "@/lib/invoices/types";
import type { Product } from "@/lib/catalog/types";
import { Button } from "@/components/ui/button";
import { formatEuro } from "@/lib/money";
import { cn } from "@/lib/utils";

const initialState: ProductActionState = {};

const fieldClassName = cn(
  "h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground",
  "outline-none placeholder:text-muted-foreground",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

const labelClassName = "text-sm font-medium text-foreground";

const vatLabels: Record<VatRate, string> = {
  "25.5": "25,5 %",
  "14": "14 %",
  "10": "10 %",
  "0": "0 %",
};

type ProductDraft = {
  id: string;
  name: string;
  description: string;
  unitPrice: string;
  vatRate: VatRate;
  unit: string;
};

function emptyDraft(defaultVat: VatRate): ProductDraft {
  return {
    id: "",
    name: "",
    description: "",
    unitPrice: "",
    vatRate: defaultVat,
    unit: "kpl",
  };
}

type ProductManagerProps = {
  products: Product[];
  missing: boolean;
  /** 25.5 when the company is VAT-registered, otherwise 0. */
  defaultVat: VatRate;
};

/** List and the add/edit form. Example cards stay on the page beside this. */
export function ProductManager({ products, missing, defaultVat }: ProductManagerProps) {
  const [saveState, saveAction, savePending] = useActionState(saveProduct, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteProduct, initialState);
  const [draft, setDraft] = useState<ProductDraft>(() => emptyDraft(defaultVat));

  useEffect(() => {
    if (saveState.savedAt) {
      setDraft(emptyDraft(defaultVat));
    }
  }, [saveState.savedAt, defaultVat]);

  function setField<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  const error = saveState.error ?? deleteState.error;
  const success = saveState.success ?? deleteState.success;

  return (
    <div className="flex flex-col gap-6">
      {missing ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          Tuotetaulua ei ole vielä luotu. Avaa Supabase → SQL Editor ja aja tiedosto
          supabase/migrations/20260927200000_customers_products.sql.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground" role="status">
          {success}
        </p>
      ) : null}

      <section className="rounded-xl bg-card px-5 py-5 ring-1 ring-foreground/10">
        <h2 className="text-base font-medium">{draft.id ? "Muokkaa tuotetta" : "Lisää tuote"}</h2>
        <form action={saveAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          {draft.id ? <input type="hidden" name="id" value={draft.id} /> : null}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="product-name" className={labelClassName}>
              Nimi
            </label>
            <input
              id="product-name"
              name="name"
              required
              value={draft.name}
              onChange={(event) => setField("name", event.target.value)}
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="product-description" className={labelClassName}>
              Kuvaus
            </label>
            <textarea
              id="product-description"
              name="description"
              rows={2}
              value={draft.description}
              onChange={(event) => setField("description", event.target.value)}
              className={cn(fieldClassName, "h-auto py-2")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="product-price" className={labelClassName}>
              Hinta ilman ALV:tä
            </label>
            <input
              id="product-price"
              name="unitPrice"
              inputMode="decimal"
              placeholder="0,00"
              required
              value={draft.unitPrice}
              onChange={(event) => setField("unitPrice", event.target.value)}
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="product-unit" className={labelClassName}>
              Yksikkö
            </label>
            <input
              id="product-unit"
              name="unit"
              list="product-units"
              value={draft.unit}
              onChange={(event) => setField("unit", event.target.value)}
              className={fieldClassName}
            />
            <datalist id="product-units">
              <option value="kpl" />
              <option value="h" />
              <option value="tunti" />
              <option value="kk" />
              <option value="pv" />
            </datalist>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="product-vat" className={labelClassName}>
              ALV
            </label>
            <select
              id="product-vat"
              name="vatRate"
              value={draft.vatRate}
              onChange={(event) => {
                if (event.target.value === "25.5" || event.target.value === "14" || event.target.value === "10" || event.target.value === "0") {
                  setField("vatRate", event.target.value);
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
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Button type="submit" size="lg" className="h-11 px-4 text-base" disabled={savePending}>
              {savePending ? "Tallennetaan…" : draft.id ? "Tallenna muutokset" : "Lisää tuote"}
            </Button>
            {draft.id ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 px-4 text-base"
                onClick={() => setDraft(emptyDraft(defaultVat))}
              >
                Peruuta
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      {products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          Ei vielä tuotteita. Lisää ensimmäinen yllä olevalla lomakkeella.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product.id} className="rounded-xl bg-card px-5 py-4 ring-1 ring-foreground/10">
              <p className="font-medium">{product.name}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {formatEuro(product.unit_price_cents)}
                <span className="text-sm font-normal text-muted-foreground"> / {product.unit}</span>
              </p>
              {product.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{product.description}</p>
              ) : null}
              <p className="mt-2 text-sm text-muted-foreground">ALV {vatLabels[product.vat_rate]}</p>
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setDraft({
                      id: product.id,
                      name: product.name,
                      description: product.description ?? "",
                      unitPrice: centsToInput(product.unit_price_cents),
                      vatRate: product.vat_rate,
                      unit: product.unit,
                    })
                  }
                >
                  Muokkaa
                </Button>
                <ConfirmDeleteDialog
                  triggerLabel="Poista"
                  title="Poista tuote"
                  description="Haluatko varmasti poistaa tämän tuotteen? Sitä ei voi palauttaa."
                  id={product.id}
                  action={deleteAction}
                  pending={deletePending}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
