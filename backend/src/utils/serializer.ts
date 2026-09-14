/**
 * BIGINT JSON SERIALIZATION:
 *
 * DhanAdhyaksh stores monetary values as integer paise in PostgreSQL BIGINT / Prisma BigInt.
 * By default, JavaScript JSON.stringify throws TypeError when encountering a native BigInt.
 *
 * This module configures global JSON serialization for BigInt so Express res.json()
 * outputs integer paise numbers directly in API responses:
 *
 * Example:
 * Database: BigInt(250000)
 * API JSON: 250000  (= ₹2,500.00)
 *
 * Monetary values MUST NEVER be converted to floating-point numbers.
 */

declare global {
  interface BigInt {
    toJSON(): number | string;
  }
}

let isBigIntSerializationConfigured = false;

export function initBigIntSerialization(): void {
  if (isBigIntSerializationConfigured) return;

  // Polyfill BigInt.prototype.toJSON for JSON.stringify & Express res.json()
  (BigInt.prototype as any).toJSON = function (this: bigint): number | string {
    const minSafe = BigInt(Number.MIN_SAFE_INTEGER);
    const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);

    if (this >= minSafe && this <= maxSafe) {
      return Number(this);
    }
    // If integer exceeds IEEE-754 53-bit precision, output as string
    return this.toString();
  };

  isBigIntSerializationConfigured = true;
}

// Auto-initialize on import
initBigIntSerialization();

/**
 * Recursively converts BigInt properties in an object or array to numbers (or strings if unsafe).
 */
export function serializeBigInt<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'bigint') {
    const minSafe = BigInt(Number.MIN_SAFE_INTEGER);
    const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
    if (data >= minSafe && data <= maxSafe) {
      return Number(data) as unknown as T;
    }
    return data.toString() as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => serializeBigInt(item)) as unknown as T;
  }

  if (typeof data === 'object' && !(data instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = serializeBigInt(value);
    }
    return result as T;
  }

  return data;
}
