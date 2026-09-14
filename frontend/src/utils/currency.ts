import { Paise } from '../types/money';

/**
 * Formats an integer amount in paise into a clean Indian Rupee (₹) currency string.
 * Uses integer math to avoid floating point inaccuracies.
 */
export function formatPaiseToRupees(paise: number | Paise, options?: { showPaise?: boolean }): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(Math.round(paise));
  const rupees = Math.floor(absPaise / 100);
  const remainingPaise = absPaise % 100;

  // Format rupees with Indian Numbering System (lakhs, crores)
  const formattedRupees = new Intl.NumberFormat('en-IN').format(rupees);

  const prefix = isNegative ? '-₹' : '₹';

  if (options?.showPaise || remainingPaise > 0) {
    const paddedPaise = remainingPaise.toString().padStart(2, '0');
    return `${prefix}${formattedRupees}.${paddedPaise}`;
  }

  return `${prefix}${formattedRupees}`;
}

/**
 * Converts a user-entered rupees decimal number or string into safe integer paise.
 * Throws if the input is not a valid number.
 */
export function rupeesToPaise(rupees: number | string): Paise {
  const numericValue = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(numericValue)) {
    throw new TypeError(`Invalid rupees value: ${rupees}`);
  }
  // Round to nearest integer paise to avoid IEEE-754 precision artifacts
  const paise = Math.round(numericValue * 100);
  return paise as Paise;
}
