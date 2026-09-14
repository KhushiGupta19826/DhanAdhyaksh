/**
 * MONEY RULE:
 * Never use floating-point numbers for monetary values.
 * All monetary amounts in Dhanadhyaksh are represented and stored as integer paise.
 *
 * 1 Rupee = 100 paise
 * ₹100    -> 10000 paise
 * ₹99.50  -> 9950 paise
 * ₹2,500  -> 250000 paise
 */

export type Paise = number & { readonly __brand: unique symbol };

/**
 * Validates and casts an integer to Paise.
 * Throws an error if the amount is not a safe integer or is negative.
 */
export function toPaise(amount: number): Paise {
  if (!Number.isInteger(amount)) {
    throw new TypeError(`Monetary value must be an integer paise value, received: ${amount}`);
  }
  if (amount < 0) {
    throw new RangeError(`Monetary value cannot be negative, received: ${amount}`);
  }
  return amount as Paise;
}
