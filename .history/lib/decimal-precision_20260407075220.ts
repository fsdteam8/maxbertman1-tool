/**
 * Decimal Precision Utility — Ensures accurate monetary calculations.
 *
 * Problem: JavaScript floating-point arithmetic introduces precision errors.
 * Example: 90.01 * 1.01 = 90.9101 but due to floating-point errors can slightly differ.
 *
 * Solution: Convert to cents (integers), perform all operations on integers,
 * then convert back to dollars. This eliminates floating-point errors entirely.
 *
 * Usage:
 *   const result = Decimal.multiply(90.01, 1.01).round();  // Always accurate
 *   const sum = Decimal.add(100.50, 50.25).round();        // Always accurate
 */

/**
 * Internal representation: amounts are stored as cents (integers).
 * This avoids ALL floating-point arithmetic errors.
 */
class Decimal {
  private cents: number; // Always an integer representing cents

  constructor(dollarAmount: number) {
    // Convert dollars to cents, rounding to nearest cent to handle input precision
    this.cents = Math.round(dollarAmount * 100);
  }

  /**
   * Multiply by a decimal factor (e.g., 1.01 for 1% markup).
   * Result: (cents × factor × 100) / 100 = cents with the factor applied
   */
  multiply(factor: number): Decimal {
    // Perform calculation: (dollars × factor) = (cents / 100 × factor)
    // = (cents × factor) / 100 cents
    const result = new Decimal(0);
    result.cents = Math.round(this.cents * factor);
    return result;
  }

  /**
   * Add another Decimal amount.
   */
  add(other: Decimal): Decimal {
    const result = new Decimal(0);
    result.cents = this.cents + other.cents;
    return result;
  }

  /**
   * Subtract another Decimal amount.
   */
  subtract(other: Decimal): Decimal {
    const result = new Decimal(0);
    result.cents = this.cents - other.cents;
    return result;
  }

  /**
   * Apply a percentage markup (e.g., 1 for 1%).
   * Result: amount × (1 + percent/100)
   */
  applyMarkup(percent: number): Decimal {
    return this.multiply(1 + percent / 100);
  }

  /**
   * Apply a percentage tax (e.g., amount × 6.35%)
   * Result: amount × (taxPercent / 100)
   */
  applyTaxPercent(taxPercent: number): Decimal {
    return this.multiply(taxPercent / 100);
  }

  /**
   * Calculate tax amount given tax rate.
   * Formula: tax = subtotal × (1 + taxRate/100) - subtotal
   * Equivalent to: taxAmount = subtotal × (taxRate/100)
   */
  static calculateTax(subtotal: Decimal, taxRate: number): Decimal {
    return subtotal.multiply(1 + taxRate / 100).subtract(subtotal);
  }

  /**
   * Multiply a tax multiplier to get total amount.
   * This preserves the original tax rate mathematically.
   */
  multiplyTaxMultiplier(taxMultiplier: number): Decimal {
    return this.multiply(taxMultiplier);
  }

  /**
   * Convert back to dollars (always 2 decimal places).
   */
  round(): number {
    return this.cents / 100;
  }

  /**
   * Get raw cents value (for debugging).
   */
  getCents(): number {
    return this.cents;
  }

  /**
   * Static method: Add multiple Decimal amounts together.
   */
  static sum(...amounts: Decimal[]): Decimal {
    const result = new Decimal(0);
    result.cents = amounts.reduce((sum, amount) => sum + amount.cents, 0);
    return result;
  }
}

/**
 * Format a Decimal value as a USD currency string for display/logging.
 */
export function formatDecimalCurrency(decimal: Decimal): string {
  const dollars = decimal.round();
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

export default Decimal;
