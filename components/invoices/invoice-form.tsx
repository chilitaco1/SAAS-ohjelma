"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useActionState, useMemo, useState } from "react";
import Link from "next/link";

import {
  deleteInvoiceDraft,
  markInvoicePaid,
  saveInvoice,
  type InvoiceActionState,
} from "@/app/actions/invoices";
import { InvoiceLines } from "@/components/invoices/invoice-lines";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatCustomerAddress } from "@/lib/catalog/format";
import type { Customer, Product } from "@/lib/catalog/types";
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
  customers?: Customer[];
  products?: Product[];
  catalogMissing?: boolean;
};

/**
 * Create / edit form for one Finnish sales invoice.
 * Amounts shown here are the same cent-based figures the server stores.
 * A published invoice is shown read-only: Finnish bookkeeping does not allow
 * changing an issued invoice.
 */
export function InvoiceForm({
  initial,
  notice,
  customers = [],
  products = [],
  catalogMissing = false,
}: InvoiceFormProps) {
  const [state, formAction, pending] = useActionState(saveInvoice, initialState);
  const readOnly = initial.status !== null && initial.status !== "draft";

  const [issueDate, setIssueDate] = useState(initial.issueDate);
  const [paymentTermsDays, setPaymentTermsDays] = useState(initial.paymentTermsDays);
  const [deliveryDate, setDeliveryDate] = useState(initial.deliveryDate);
  const [interestRate, setInterestRate] = useState(initial.interestRate);
  const [referenceNumber, setReferenceNumber] = useState(initial.referenceNumber);
  const [customerName, setCustomerName] = useState(initial.customerName);
  const [customerId, setCustomerId] = useState(initial.customerId);
  const [customerBusinessId, setCustomerBusinessId] = useState(initial.customerBusinessId);
  const [customerEmail, setCustomerEmail] = useState(initial.customerEmail);
  const [customerAddress, setCustomerAddress] = useState(initial.customerAddress);
  const [customerQuery, setCustomerQuery] = useState("");
  const [replacingCustomer, setReplacingCustomer] = useState(false);
  const [rows, setRows] = useState(initial.rows);

  const matchingCustomers = useMemo(() => {
    const needle = customerQuery.trim().toLocaleLowerCase("fi");
    if (!needle) {
      return customers;
    }
    return customers.filter((customer) => {
      const name = customer.name.toLocaleLowerCase("fi");
      const businessId = (customer.business_id ?? "").toLocaleLowerCase("fi");
      return name.includes(needle) || businessId.includes(needle);
    });
  }, [customerQuery, customers]);

  function chooseCustomer(customer: Customer) {
    setCustomerId(customer.id);
    setCustomerName(customer.name);
    setCustomerBusinessId(customer.business_id ?? "");
    setCustomerEmail(customer.email ?? "");
    setCustomerAddress(formatCustomerAddress(customer));
    setCustomerQuery("");
    setReplacingCustomer(false);
  }

  const dueDate = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDate) || !/^\d{1,3}$/.test(paymentTermsDays)) {
      return null;
    }
    return addDays(issueDate, Number(paymentTermsDays));
  }, [issueDate, paymentTermsDays]);

  const deleteFormId = initial.id ? `delete-draft-${initial.id}` : "";

  return (
    <>
    <form action={formAction} className="flex flex-col gap-8">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      {notice && !notice.startsWith("Luonnos tallennettiin") ? (
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
          Luonnoksella ei ole vielä laskunumeroa. Numero syntyy, kun julkaiset laskun.
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

      {/* Ostaja valitaan tallennetuista asiakkaista. Lasku kopioi tiedot itselleen. */}
      <section className="rounded-xl bg-card px-5 py-5 ring-1 ring-foreground/10">
        <h2 className="text-base font-medium">Laskutettava asiakas</h2>
        <input type="hidden" name="customerId" value={customerId} />
        <input type="hidden" name="customerName" value={customerName} />
        <input type="hidden" name="customerBusinessId" value={customerBusinessId} />
        <input type="hidden" name="customerEmail" value={customerEmail} />
        <input type="hidden" name="customerAddress" value={customerAddress} />

        {readOnly ? (
          <CustomerSnapshot
            name={customerName}
            businessId={customerBusinessId}
            email={customerEmail}
            address={customerAddress}
            customer={null}
          />
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {customerName && !replacingCustomer ? (
              <SelectedCustomer
                name={customerName}
                businessId={customerBusinessId}
                email={customerEmail}
                address={customerAddress}
                customer={customers.find((customer) => customer.id === customerId) ?? null}
                editHref={/^[0-9a-f-]{36}$/i.test(customerId) ? `/asiakkaat?muokkaa=${customerId}` : null}
                onReplace={() => setReplacingCustomer(true)}
              />
            ) : catalogMissing ? (
              <p className="text-sm text-muted-foreground">
                Asiakasluetteloa ei ole vielä luotu. Aja Supabasessa tiedosto
                supabase/migrations/20260927200000_customers_products.sql.
              </p>
            ) : customers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ei vielä asiakkaita.{" "}
                <Link href="/asiakkaat" className="text-primary underline-offset-4 hover:underline">
                  Lisää asiakas
                </Link>{" "}
                ennen laskua.
              </p>
            ) : (
              <>
                <label htmlFor="customer-search" className={labelClassName}>
                  Hae asiakasta
                </label>
                <input
                  id="customer-search"
                  value={customerQuery}
                  onChange={(event) => setCustomerQuery(event.target.value)}
                  placeholder="Nimi tai Y-tunnus..."
                  className={fieldClassName}
                />
                {customerQuery.trim() ? (
                  matchingCustomers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Ei osumia.</p>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Hakutulokset</p>
                      <ul className="mt-1.5 flex max-h-40 flex-col gap-2 overflow-y-auto">
                        {matchingCustomers.map((customer) => (
                          <li key={customer.id}>
                            <button
                              type="button"
                              onClick={() => chooseCustomer(customer)}
                              className="flex w-full flex-col rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm hover:bg-muted/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                            >
                              <span className="font-medium">{customer.name}</span>
                              {customer.business_id ? (
                                <span className="text-muted-foreground">Y-tunnus {customer.business_id}</span>
                              ) : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                ) : null}
                {!customerName ? (
                  <p className="text-sm text-muted-foreground">Asiakasta ei ole vielä valittu.</p>
                ) : null}
              </>
            )}
          </div>
        )}
      </section>

      <InvoiceLines rows={rows} readOnly={readOnly} onChange={setRows} products={products} />

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
        <div className="flex flex-col gap-3 border-t border-border pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                Tallenna luonnos
              </Button>
              <Button
                type="submit"
                name="intent"
                value="publish"
                size="lg"
                className="h-11 px-5 text-base"
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
            <div className="flex items-center gap-4">
              {pending ? (
                <p className="text-sm text-muted-foreground" role="status">
                  Tallennetaan…
                </p>
              ) : notice?.startsWith("Luonnos tallennettiin") ? (
                <p className="text-sm text-muted-foreground" role="status">
                  ✓ Tallennettu. Laskunumeroa ei ole vielä annettu.
                </p>
              ) : null}
              {initial.id ? <DeleteDraftDialog formId={deleteFormId} /> : null}
            </div>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            Julkaisu antaa laskunumeron ja lähettää laskun asiakkaan sähköpostiin, jos osoite on tallennettu.
          </p>
        </div>
      )}
    </form>
    {initial.id && !readOnly ? (
      <form id={deleteFormId} action={deleteInvoiceDraft}>
        <input type="hidden" name="id" value={initial.id} />
      </form>
    ) : null}
    </>
  );
}

/** Asks before a saved draft is removed. The delete form sits outside the invoice form. */
function DeleteDraftDialog({ formId }: { formId: string }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger
        type="button"
        className={cn(buttonVariants({ variant: "ghost" }), "h-11 px-3 text-sm text-muted-foreground")}
      >
        Poista luonnos
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card px-5 py-5 text-foreground ring-1 ring-foreground/10">
          <Dialog.Title className="text-base font-medium">Poista luonnos</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
            Haluatko varmasti poistaa tämän luonnoksen? Sitä ei voi palauttaa.
          </Dialog.Description>
          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close
              type="button"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-4 text-base")}
            >
              Peruuta
            </Dialog.Close>
            <button
              type="submit"
              form={formId}
              className={cn(buttonVariants({ variant: "destructive", size: "lg" }), "h-11 px-4 text-base")}
            >
              Poista
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SelectedCustomer({
  name,
  businessId,
  email,
  address,
  customer,
  editHref,
  onReplace,
}: {
  name: string;
  businessId: string;
  email: string;
  address: string;
  customer: Customer | null;
  editHref: string | null;
  onReplace: () => void;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">✓ {name}</p>
          {businessId ? (
            <p className="mt-0.5 text-sm text-muted-foreground">Y-tunnus {businessId}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3 text-sm">
          {editHref ? (
            <Link
              href={editHref}
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Muokkaa
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onReplace}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Vaihda
          </button>
        </div>
      </div>
      <CustomerSnapshot
        name={name}
        businessId={businessId}
        email={email}
        address={address}
        customer={customer}
        showIdentity={false}
        className="mt-3"
      />
    </div>
  );
}

function CustomerSnapshot({
  name,
  businessId,
  email,
  address,
  customer,
  showIdentity = true,
  className,
}: {
  name: string;
  businessId: string;
  email: string;
  address: string;
  customer: Customer | null;
  showIdentity?: boolean;
  className?: string;
}) {
  const stored = splitStoredAddress(address);
  const street = customer?.address?.trim() || stored.street;
  const cityLine =
    [customer?.postal_code, customer?.city].filter(Boolean).join(" ") || stored.cityLine;
  const country = customer?.country?.trim() || stored.country;

  return (
    <dl className={cn("grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2", className)}>
      {showIdentity ? (
        <div className="sm:col-span-2">
          <dt className="sr-only">Nimi</dt>
          <dd className="font-medium">{name}</dd>
        </div>
      ) : null}
      {showIdentity && businessId ? <CustomerDetail label="Y-tunnus" value={businessId} /> : null}
      {email ? <CustomerDetail label="Sähköposti" value={email} /> : null}
      {street ? <CustomerDetail label="Osoite" value={street} /> : null}
      {cityLine ? <CustomerDetail label="Postinumero ja kaupunki" value={cityLine} /> : null}
      {country ? <CustomerDetail label="Maa" value={country} /> : null}
    </dl>
  );
}

function CustomerDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}

/** The invoice stores the address as street, postal line, then country. */
function splitStoredAddress(address: string): {
  street: string;
  cityLine: string;
  country: string;
} {
  const lines = address
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length >= 3) {
    return { street: lines[0], cityLine: lines[1], country: lines.slice(2).join(" ") };
  }
  if (lines.length === 2) {
    return { street: lines[0], cityLine: lines[1], country: "" };
  }
  return { street: lines[0] ?? "", cityLine: "", country: "" };
}
