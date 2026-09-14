/**
 * CARDINAL MONEY RULE:
 * Never use floating-point numbers for monetary values.
 * All monetary amounts in Dhanadhyaksh are represented and stored as integer paise.
 *
 * 1 Rupee = 100 paise
 * ₹100    -> 10000 paise
 * ₹99.50  -> 9950 paise
 * ₹2,500  -> 250000 paise
 */

export type Paise = number & { readonly __brand: unique symbol };

export interface MoneyValue {
  paise: Paise;
  formatted: string;
}
