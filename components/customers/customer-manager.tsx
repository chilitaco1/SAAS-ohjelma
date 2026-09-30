"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import {
  deleteCustomer,
  saveCustomer,
  type CustomerActionState,
} from "@/app/actions/customers";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { formatCustomerAddress } from "@/lib/catalog/format";
import type { Customer } from "@/lib/catalog/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const initialState: CustomerActionState = {};

const fieldClassName = cn(
  "h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground",
  "outline-none placeholder:text-muted-foreground",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

const labelClassName = "text-sm font-medium text-foreground";

type CustomerDraft = {
  id: string;
  name: string;
  businessId: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone: string;
};

const emptyDraft: CustomerDraft = {
  id: "",
  name: "",
  businessId: "",
  address: "",
  postalCode: "",
  city: "",
  country: "Suomi",
  email: "",
  phone: "",
};

function fromCustomer(customer: Customer): CustomerDraft {
  return {
    id: customer.id,
    name: customer.name,
    businessId: customer.business_id ?? "",
    address: customer.address ?? "",
    postalCode: customer.postal_code ?? "",
    city: customer.city ?? "",
    country: customer.country ?? "Suomi",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
  };
}

type CustomerManagerProps = {
  customers: Customer[];
  missing: boolean;
  editingId?: string;
};

/** List, search, and the add/edit form for the signed-in user's customers. */
export function CustomerManager({ customers, missing, editingId }: CustomerManagerProps) {
  const [saveState, saveAction, savePending] = useActionState(saveCustomer, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteCustomer, initialState);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<CustomerDraft>(() => {
    const found = editingId ? customers.find((customer) => customer.id === editingId) : undefined;
    return found ? fromCustomer(found) : emptyDraft;
  });

  useEffect(() => {
    if (saveState.savedAt) {
      setDraft(emptyDraft);
    }
  }, [saveState.savedAt]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fi");
    if (!needle) {
      return customers;
    }
    return customers.filter((customer) => customer.name.toLocaleLowerCase("fi").includes(needle));
  }, [customers, query]);

  function setField(key: keyof CustomerDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  const error = saveState.error ?? deleteState.error;
  const success = saveState.success ?? deleteState.success;

  return (
    <div className="flex flex-col gap-6">
      {missing ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          Asiakastaulua ei ole vielä luotu. Avaa Supabase → SQL Editor ja aja tiedosto
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
        <h2 className="text-base font-medium">
          {draft.id ? "Muokkaa asiakasta" : "Lisää asiakas"}
        </h2>
        <form action={saveAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          {draft.id ? <input type="hidden" name="id" value={draft.id} /> : null}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="customer-name" className={labelClassName}>
              Nimi
            </label>
            <input
              id="customer-name"
              name="name"
              required
              value={draft.name}
              onChange={(event) => setField("name", event.target.value)}
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="customer-business-id" className={labelClassName}>
              Y-tunnus
            </label>
            <input
              id="customer-business-id"
              name="businessId"
              placeholder="1234567-8"
              value={draft.businessId}
              onChange={(event) => setField("businessId", event.target.value)}
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="customer-email" className={labelClassName}>
              Sähköposti
            </label>
            <input
              id="customer-email"
              name="email"
              type="email"
              value={draft.email}
              onChange={(event) => setField("email", event.target.value)}
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="customer-address" className={labelClassName}>
              Katuosoite
            </label>
            <input
              id="customer-address"
              name="address"
              required
              value={draft.address}
              onChange={(event) => setField("address", event.target.value)}
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="customer-postal" className={labelClassName}>
              Postinumero
            </label>
            <input
              id="customer-postal"
              name="postalCode"
              required
              value={draft.postalCode}
              onChange={(event) => setField("postalCode", event.target.value)}
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="customer-city" className={labelClassName}>
              Postitoimipaikka
            </label>
            <input
              id="customer-city"
              name="city"
              required
              value={draft.city}
              onChange={(event) => setField("city", event.target.value)}
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="customer-country" className={labelClassName}>
              Maa
            </label>
            <input
              id="customer-country"
              name="country"
              value={draft.country}
              onChange={(event) => setField("country", event.target.value)}
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="customer-phone" className={labelClassName}>
              Puhelin
            </label>
            <input
              id="customer-phone"
              name="phone"
              value={draft.phone}
              onChange={(event) => setField("phone", event.target.value)}
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <Button type="submit" size="lg" className="h-11 px-4 text-base" disabled={savePending}>
              {savePending ? "Tallennetaan…" : draft.id ? "Tallenna muutokset" : "Lisää asiakas"}
            </Button>
            {draft.id ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 px-4 text-base"
                onClick={() => setDraft(emptyDraft)}
              >
                Peruuta
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <label htmlFor="customer-search" className={labelClassName}>
          Hae nimellä
        </label>
        <input
          id="customer-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className={cn(fieldClassName, "max-w-sm")}
        />

        {customers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
            Ei vielä asiakkaita. Lisää ensimmäinen yllä olevalla lomakkeella.
          </p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ei asiakkaita haulla “{query.trim()}”.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((customer) => (
              <li
                key={customer.id}
                className="rounded-xl bg-card px-5 py-4 ring-1 ring-foreground/10"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                      {[
                        customer.business_id ? `Y-tunnus ${customer.business_id}` : null,
                        formatCustomerAddress(customer),
                        customer.email,
                        customer.phone,
                      ]
                        .filter(Boolean)
                        .join("\n") || "Ei yhteystietoja"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDraft(fromCustomer(customer))}
                    >
                      Muokkaa
                    </Button>
                    <ConfirmDeleteDialog
                      triggerLabel="Poista"
                      title="Poista asiakas"
                      description="Haluatko varmasti poistaa tämän asiakkaan? Sitä ei voi palauttaa."
                      id={customer.id}
                      action={deleteAction}
                      pending={deletePending}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
