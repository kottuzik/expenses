const currency = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" });

// Display only; amounts arrive from the API as decimal strings.
export function formatCurrency(amount: string | number): string {
  return currency.format(Number(amount));
}
