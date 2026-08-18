export type Cents = number & { readonly __brand: "Cents" };

const DECIMALS_EPSILON = 1e-9;

export function toCents(value: number | string): Cents {
  if (typeof value === "string" && value.trim() === "") {
    throw new Error("Invalid money value");
  }
  const amount = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(amount)) {
    throw new Error("Invalid money value");
  }
  if (amount < 0) {
    throw new Error("Money value cannot be negative");
  }
  const cents = Math.round(amount * 100);
  if (Math.abs(amount * 100 - cents) > DECIMALS_EPSILON) {
    throw new Error("Money value cannot have more than two decimal places");
  }
  return cents as Cents;
}

export function fromCents(cents: Cents): number {
  return cents / 100;
}
