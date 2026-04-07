/**
 * Currency formatting and markup calculation utilities.
 * All functions are pure — no side effects.
 *
 * PRECISION: All monetary calculations use Decimal arithmetic internally
 * to avoid floating-point errors in JavaScript. This ensures 100% accuracy
 * for all financial calculations.
 */

import Decimal from "@/lib/decimal-precision";

/**
 * Apply a percentage markup to a value, rounded to 2 decimal places.
 * Uses precise decimal arithmetic instead of floating-point.
 *
 * @param value - Original monetary value
 * @param percent - Markup percentage (default 1%)
 */
export function applyMarkup(value: number, percent: number = 1): number {
  return new Decimal(value).applyMarkup(percent).round();
}

/**
 * Format a number as a USD currency string.
 * e.g. 1234.5 → "$1,234.50"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Parse a currency string like "$1,234.50" or "1234.50" to a number.
 * Returns null if the string cannot be parsed.
 */
export function parseCurrencyString(str: string): number | null {
  if (!str) return null;
  const cleaned = str.replace(/[$,\s]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Calculate the markup difference between two values.
 * Uses precise decimal arithmetic for accuracy.
 */
export function markupDifference(original: number, marked: number): number {
  const diff = new Decimal(marked).subtract(new Decimal(original)).round();
  return diff;
}

/**
 * Format a difference for display — includes sign.
 * e.g. +$1.01 or -$0.50
 */
export function formatDifference(diff: number): string {
  const sign = diff >= 0 ? "+" : "";
  return `${sign}${formatCurrency(diff)}`;
}
