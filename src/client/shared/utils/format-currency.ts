const formatterCache = new Map<string, Intl.NumberFormat>();

export function formatCurrency(value: number, currency: string): string {
  let formatter = formatterCache.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-AU', { style: 'currency', currency });
    formatterCache.set(currency, formatter);
  }
  return formatter.format(value);
}
