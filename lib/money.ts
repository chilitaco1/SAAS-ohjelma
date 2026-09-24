const euroFormatter = new Intl.NumberFormat("fi-FI", {
  style: "currency",
  currency: "EUR",
});

/** Format a cent amount as Finnish euros, for example 590 becomes "5,90 €". */
export function formatEuro(cents: number): string {
  return euroFormatter.format(cents / 100);
}
