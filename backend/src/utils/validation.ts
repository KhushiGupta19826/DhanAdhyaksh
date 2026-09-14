import { ValidationError } from './errors';

/**
 * Ensures a required field is not undefined, null, or empty string.
 */
export function validateRequired(value: unknown, fieldName: string): void {
  if (value === undefined || value === null) {
    throw new ValidationError(`'${fieldName}' is required`);
  }
  if (typeof value === 'string' && value.trim() === '') {
    throw new ValidationError(`'${fieldName}' cannot be empty`);
  }
}

/**
 * Validates a string value with optional length constraints.
 */
export function validateString(
  value: unknown,
  fieldName: string,
  options?: { min?: number; max?: number; required?: boolean }
): string {
  const isRequired = options?.required ?? true;

  if (value === undefined || value === null) {
    if (isRequired) {
      throw new ValidationError(`'${fieldName}' is required`);
    }
    return '';
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`'${fieldName}' must be a string`);
  }

  const trimmed = value.trim();

  if (isRequired && trimmed === '') {
    throw new ValidationError(`'${fieldName}' cannot be empty`);
  }

  if (options?.min !== undefined && trimmed.length < options.min) {
    throw new ValidationError(
      `'${fieldName}' must be at least ${options.min} character(s) long`
    );
  }

  if (options?.max !== undefined && trimmed.length > options.max) {
    throw new ValidationError(
      `'${fieldName}' must not exceed ${options.max} characters`
    );
  }

  return trimmed;
}

/**
 * MONEY VALIDATION RULE:
 * Validates that an amount represents an integer amount of paise.
 * Strictly prohibits floating-point numbers, negative numbers, or non-numeric types.
 *
 * Example valid: 10000 (₹100), 250000 (₹2,500)
 * Example invalid: 100.50 (floating-point float), -500 (negative), "abc" (non-numeric)
 */
export function validatePaise(
  value: unknown,
  fieldName: string,
  options?: { allowZero?: boolean }
): bigint {
  if (value === undefined || value === null) {
    throw new ValidationError(`'${fieldName}' is required`);
  }

  let bigintVal: bigint;

  if (typeof value === 'bigint') {
    bigintVal = value;
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new ValidationError(`'${fieldName}' must be a finite number`);
    }
    if (!Number.isInteger(value)) {
      throw new ValidationError(
        `'${fieldName}' must be an integer amount in paise (floating-point money is strictly prohibited)`
      );
    }
    bigintVal = BigInt(value);
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^-?\d+$/.test(trimmed)) {
      throw new ValidationError(
        `'${fieldName}' must be an integer amount in paise, received: '${value}'`
      );
    }
    bigintVal = BigInt(trimmed);
  } else {
    throw new ValidationError(`'${fieldName}' must be an integer amount in paise`);
  }

  if (options?.allowZero) {
    if (bigintVal < 0n) {
      throw new ValidationError(`'${fieldName}' cannot be negative`);
    }
  } else {
    if (bigintVal <= 0n) {
      throw new ValidationError(`'${fieldName}' must be greater than zero`);
    }
  }

  return bigintVal;
}

/**
 * Validates a route or query ID parameter as a positive integer bigint.
 */
export function validateId(value: unknown, paramName = 'id'): bigint {
  if (value === undefined || value === null) {
    throw new ValidationError(`'${paramName}' is required`);
  }

  const str = String(value).trim();
  if (!/^\d+$/.test(str)) {
    throw new ValidationError(`'${paramName}' must be a valid positive integer ID`);
  }

  const id = BigInt(str);
  if (id <= 0n) {
    throw new ValidationError(`'${paramName}' must be greater than zero`);
  }

  return id;
}

/**
 * Validates an ISO date string or Date object.
 */
export function validateDate(value: unknown, fieldName: string): Date {
  if (value === undefined || value === null) {
    throw new ValidationError(`'${fieldName}' is required`);
  }

  const date = value instanceof Date ? value : new Date(String(value));

  if (isNaN(date.getTime())) {
    throw new ValidationError(
      `'${fieldName}' must be a valid date (e.g. YYYY-MM-DD or ISO 8601)`
    );
  }

  return date;
}

/**
 * Validates that a value belongs to an allowed set of enum values.
 */
export function validateEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fieldName: string
): T {
  if (typeof value !== 'string' || !allowedValues.includes(value as T)) {
    throw new ValidationError(
      `'${fieldName}' must be one of: ${allowedValues.join(', ')}`
    );
  }
  return value as T;
}
