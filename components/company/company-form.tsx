"use client";

import { useActionState } from "react";

import { saveCompanySettings, type CompanyActionState } from "@/app/actions/company";
import { Button } from "@/components/ui/button";
import type { CompanySettings } from "@/lib/invoices/types";
import { cn } from "@/lib/utils";

const initialState: CompanyActionState = {};

const fieldClassName = cn(
  "h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground",
  "outline-none placeholder:text-muted-foreground",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

const labelClassName = "text-sm font-medium text-foreground";

type CompanyFormProps = {
  company: CompanySettings | null;
};

/** Seller details stored once and printed on each issued invoice. */
export function CompanyForm({ company }: CompanyFormProps) {
  const [state, formAction, pending] = useActionState(saveCompanySettings, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground" role="status">
          {state.success}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="companyName" className={labelClassName}>
            Yrityksen nimi
          </label>
          <input
            id="companyName"
            name="companyName"
            required
            defaultValue={company?.company_name ?? ""}
            className={fieldClassName}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="businessId" className={labelClassName}>
            Y-tunnus
          </label>
          <input
            id="businessId"
            name="businessId"
            placeholder="1234567-8"
            defaultValue={company?.y_tunus ?? ""}
            className={fieldClassName}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bic" className={labelClassName}>
            BIC / SWIFT
          </label>
          <input
            id="bic"
            name="bic"
            placeholder="NDEAFIHH"
            defaultValue={company?.bic_swift ?? ""}
            className={fieldClassName}
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="iban" className={labelClassName}>
            IBAN
          </label>
          <input
            id="iban"
            name="iban"
            placeholder="FI00 0000 0000 0000 00"
            defaultValue={company?.iban ?? ""}
            className={fieldClassName}
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="billingAddress" className={labelClassName}>
            Laskutusosoite
          </label>
          <textarea
            id="billingAddress"
            name="billingAddress"
            rows={3}
            defaultValue={company?.billing_address ?? ""}
            className={cn(fieldClassName, "h-auto py-2")}
          />
        </div>
      </div>

      <Button type="submit" size="lg" className="h-11 w-fit px-4 text-base" disabled={pending}>
        {pending ? "Tallennetaan…" : "Tallenna yritystiedot"}
      </Button>
    </form>
  );
}
