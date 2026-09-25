"use client";

import { useActionState, useMemo, useState } from "react";

import { markInvoicePaid, saveInvoice, type InvoiceActionState } from "@/app/actions/invoices";
import { InvoiceLines } from "@/components/invoices/invoice-lines";
import { Button } from "@/components/ui/button";
import { addDays } from "@/lib/invoices/calculate";
import type { InvoiceFormValues } from "@/lib/invoices/form-values";
import { formatReferenceNumber } from "@/lib/invoices/reference";
import { invoiceStatusLabel } from "@/lib/invoices/types";
import { cn } from "@/lib/utils";

const initialState: InvoiceActionState = {};

const fieldClassName = cn(
  "h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground",
  "outline-none placeholder:text-muted-foreground",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
);

const labelClassName = "text-sm font-medium text-foreground";

type InvoiceFormProps = {
  initial: InvoiceFormValues;
  notice?: string;
};

/**
 * Create / edit form for one Finnish sales invoice.
 * Amounts shown here are the same cent-based figures the server stores.
 * A published invoice is shown read-only: Finnish bookkeeping does not allow
 * changing an issued invoice.
 */
export function InvoiceForm({ initial, notice }: InvoiceFormProps) {
  const [state, formAction, pending] = useActionState(saveInvoice, initialState);
  const readOnly = initial.status !== null && initial.status !== "draft";

  const [issueDate, setIssueDate] = useState(initial.issueDate);
  const [paymentTermsDays, setPaymentTermsDays] = useState(initial.paymentTermsDays);
  const [deliveryDate, setDeliveryDate] = useState(initial.deliveryDate);
  const [interestRate, setInterestRate] = useState(initial.interestRate);
  const [referenceNumber, setReferenceNumber] = useState(initial.referenceNumber);
  const [customerName, setCustomerName] = useState(initial.customerName);
  const [customerBusinessId, setCustomerBusinessId] = useState(initial.customerBusinessId);
  const [customerEmail, setCustomerEmail] = useState(initial.customerEmail);
  const [customerAddress, setCustomerAddress] = useState(initial.customerAddress);
  const [rows, setRows] = useState(initial.rows);

  const dueDate = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDate) || !/^\d{1,3}$/.test(paymentTermsDays)) {
      return null;
    }
    return addDays(issueDate, Number(paymentTermsDays));
  }, [issueDate, paymentTermsDays]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      {notice ? (
        <p className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground" role="status">
          {notice}
        </p>
      ) : null}
      {state.error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      {readOnly ? (
        <div className="rounded-xl bg-card px-5 py-5 ring-1 ring-foreground/10">
          <p className="text-sm text-muted-foreground">
            {invoiceStatusLabel[initial.status ?? "sent"]}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {initial.invoiceNumber}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Julkaistua laskua ei voi muuttaa. Korjaus tehdään hyvityslaskulla.
          </p>
        </div>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">
          Luonnoksella ei ole laskunumeroa. Numero ja viitenumero syntyvät, kun
          julkaiset laskun. Julkaistua laskua ei voi enää muuttaa. Myyjän nimi
          ja Y-tunnus tulevat myöhemmin Yritys-sivulta. Ne kuuluvat viralliseen
          laskuun.
        </p>
      )}

      {/* Perustiedot: laskun päivä, maksuehto ja siitä laskettu eräpäivä. */}
      <section className="rounded-xl bg-card px-5 py-5 ring-1 ring-foreground/10">
        <h2 className="text-base font-medium">Perustiedot</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="issueDate" className={labelClassName}>
              Laskun päivä
            </label>
            <input
              id="issueDate"
              name="issueDate"
              type="date"
              required
              value={issueDate}
              disabled={readOnly}
              onChange={(event) => setIssueDate(event.target.value)}
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="paymentTermsDays" className={labelClassName}>
              Maksuehto, päivää
            </label>
            <input
              id="paymentTermsDays"
              name="paymentTermsDays"
              inputMode="numeric"
              value={paymentTermsDays}
              disabled={readOnly}
              onChange={(event) => setPaymentTermsDays(event.target.value)}
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className={labelClassName}>Eräpäivä</p>
            <p className="flex h-11 items-center rounded-lg bg-muted px-3 text-base tabular-nums">
              {dueDate
                ? new Intl.DateTimeFormat("fi-FI", { timeZone: "UTC" }).format(
                    new Date(`${dueDate}T00:00:00Z`),
                  )
                : "—"}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="deliveryDate" className={labelClassName}>
              Toimituspäivä
            </label>
            <input
              id="deliveryDate"
              name="deliveryDate"
              type="date"
              value={deliveryDate}
              disabled={readOnly}
              onChange={(event) => setDeliveryDate(event.target.value)}
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="interestRate" className={labelClassName}>
              Viivästyskorko, %
            </label>
            <input
              id="interestRate"
              name="interestRate"
              inputMode="decimal"
              placeholder="0,00"
              value={interestRate}
              disabled={readOnly}
              onChange={(event) => setInterestRate(event.target.value)}
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="referenceNumber" className={labelClassName}>
              Viitenumero
            </label>
            <input
              id="referenceNumber"
              name="referenceNumber"
              value={
                readOnly && referenceNumber
                  ? formatReferenceNumber(referenceNumber)
                  : referenceNumber
              }
              placeholder={readOnly ? undefined : "Lasketaan julkaistaessa"}
              disabled={readOnly}
              onChange={(event) => setReferenceNumber(event.target.value)}
              className={fieldClassName}
            />
          </div>
        </div>
      </section>

      {/* Ostajan tiedot. Y-tunnus on valinnainen, jos ostaja on yksityishenkilö. */}
      <section className="rounded-xl bg-card px-5 py-5 ring-1 ring-foreground/10">
        <h2 className="text-base font-medium">Asiakas</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="customerName" className={labelClassName}>
              Nimi
            </label>
            <input
              id="customerName"
              name="customerName"
              value={customerName}
              disabled={readOnly}
              onChange={(event) => setCustomerName(event.target.value)}
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="customerBusinessId" className={labelClassName}>
              Y-tunnus
            </label>
            <input
              id="customerBusinessId"
              name="customerBusinessId"
              placeholder="1234567-8"
              value={customerBusinessId}
              disabled={readOnly}
              onChange={(event) => setCustomerBusinessId(event.target.value)}
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="customerEmail" className={labelClassName}>
              Sähköposti
            </label>
            <input
              id="customerEmail"
              name="customerEmail"
              type="email"
              value={customerEmail}
              disabled={readOnly}
              onChange={(event) => setCustomerEmail(event.target.value)}
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="customerAddress" className={labelClassName}>
              Osoite
            </label>
            <textarea
              id="customerAddress"
              name="customerAddress"
              rows={3}
              value={customerAddress}
              disabled={readOnly}
              onChange={(event) => setCustomerAddress(event.target.value)}
              className={cn(fieldClassName, "h-auto py-2")}
            />
          </div>
        </div>
      </section>

      <InvoiceLines rows={rows} readOnly={readOnly} onChange={setRows} />

      {initial.status === "sent" && initial.id ? (
        <Button
          type="submit"
          formAction={markInvoicePaid}
          variant="outline"
          size="lg"
          className="h-11 px-4 text-base"
        >
          Merkitse maksetuksi
        </Button>
      ) : null}

      {readOnly ? null : (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="submit"
            name="intent"
            value="draft"
            variant="outline"
            size="lg"
            className="h-11 px-4 text-base"
            disabled={pending}
          >
            {pending ? "Tallennetaan…" : "Tallenna luonnos"}
          </Button>
          <Button
            type="submit"
            name="intent"
            value="publish"
            size="lg"
            className="h-11 px-4 text-base"
            disabled={pending}
            onClick={(event) => {
              const ok = window.confirm(
                "Julkaistu lasku saa numeron, eikä sitä voi enää muokata. Julkaistaanko lasku?",
              );
              if (!ok) {
                event.preventDefault();
              }
            }}
          >
            Julkaise ja lähetä
          </Button>
        </div>
      )}
    </form>
  );
}
