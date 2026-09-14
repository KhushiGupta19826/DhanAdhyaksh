import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import '../src/utils/serializer'; // BigInt JSON serialization
import { errorHandler } from '../src/middleware/errorHandler';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  BadRequestError,
} from '../src/utils/errors';
import {
  validatePaise,
  validateId,
  validateString,
  validateRequired,
  validateDate,
  validateEnum,
} from '../src/utils/validation';

describe('Backend Foundation: BigInt JSON Serialization', () => {
  it('should serialize native BigInt in Express res.json without throwing TypeError', async () => {
    const testApp = express();
    testApp.use(express.json());

    testApp.get('/test-bigint', (_req, res) => {
      res.json({
        id: BigInt(1),
        amountPaise: BigInt(250000), // ₹2,500
        balancePaise: BigInt(10000),  // ₹100
      });
    });

    const response = await request(testApp).get('/test-bigint');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 1,
      amountPaise: 250000,
      balancePaise: 10000,
    });
  });
});

describe('Backend Foundation: Error Handling & Formats', () => {
  const errorApp = express();
  errorApp.use(express.json());

  errorApp.get('/throw-validation', () => {
    throw new ValidationError('Amount must be greater than zero');
  });

  errorApp.get('/throw-not-found', () => {
    throw new NotFoundError('Account not found');
  });

  errorApp.get('/throw-conflict', () => {
    throw new ConflictError('Account with this name already exists');
  });

  errorApp.get('/throw-bad-request', () => {
    throw new BadRequestError('Invalid query parameters');
  });

  errorApp.use(errorHandler);

  it('should return 400 and VALIDATION_ERROR format for ValidationError', async () => {
    const response = await request(errorApp).get('/throw-validation');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Amount must be greater than zero',
      },
    });
  });

  it('should return 404 and NOT_FOUND format for NotFoundError', async () => {
    const response = await request(errorApp).get('/throw-not-found');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Account not found',
      },
    });
  });

  it('should return 409 and CONFLICT format for ConflictError', async () => {
    const response = await request(errorApp).get('/throw-conflict');

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: 'CONFLICT',
        message: 'Account with this name already exists',
      },
    });
  });

  it('should return 400 and BAD_REQUEST format for BadRequestError', async () => {
    const response = await request(errorApp).get('/throw-bad-request');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid query parameters',
      },
    });
  });

  it('should handle malformed JSON syntax error with 400 and BAD_REQUEST', async () => {
    const response = await request(errorApp)
      .post('/throw-validation')
      .set('Content-Type', 'application/json')
      .send('{"invalid_json:');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });
});

describe('Backend Foundation: Request Validation Utilities', () => {
  describe('validatePaise (Cardinal Money Rule)', () => {
    it('should accept valid positive integer paise numbers and strings', () => {
      expect(validatePaise(10000, 'amount')).toBe(10000n);
      expect(validatePaise('250000', 'amount')).toBe(250000n);
      expect(validatePaise(BigInt(500), 'amount')).toBe(500n);
    });

    it('should reject floating-point numbers', () => {
      expect(() => validatePaise(99.5, 'amount')).toThrow(ValidationError);
      expect(() => validatePaise(99.5, 'amount')).toThrow(
        /must be an integer amount in paise/
      );
    });

    it('should reject zero or negative amounts by default', () => {
      expect(() => validatePaise(0, 'amount')).toThrow(ValidationError);
      expect(() => validatePaise(-100, 'amount')).toThrow(ValidationError);
    });

    it('should allow zero when explicitly permitted', () => {
      expect(validatePaise(0, 'initial_balance', { allowZero: true })).toBe(0n);
      expect(() => validatePaise(-1, 'initial_balance', { allowZero: true })).toThrow(
        ValidationError
      );
    });

    it('should reject non-numeric inputs', () => {
      expect(() => validatePaise('abc', 'amount')).toThrow(ValidationError);
      expect(() => validatePaise(null, 'amount')).toThrow(ValidationError);
      expect(() => validatePaise(undefined, 'amount')).toThrow(ValidationError);
    });
  });

  describe('validateId', () => {
    it('should accept valid integer ID strings and numbers', () => {
      expect(validateId('1', 'id')).toBe(1n);
      expect(validateId(42, 'id')).toBe(42n);
    });

    it('should reject non-integer or non-positive IDs', () => {
      expect(() => validateId('0', 'id')).toThrow(ValidationError);
      expect(() => validateId('-5', 'id')).toThrow(ValidationError);
      expect(() => validateId('abc', 'id')).toThrow(ValidationError);
    });
  });

  describe('validateString & validateRequired', () => {
    it('should trim and validate required strings', () => {
      expect(validateString('  Wallet  ', 'name')).toBe('Wallet');
      expect(() => validateString('   ', 'name')).toThrow(ValidationError);
      expect(() => validateString(123, 'name')).toThrow(ValidationError);
    });

    it('should enforce length constraints', () => {
      expect(() => validateString('Hi', 'name', { min: 3 })).toThrow(ValidationError);
      expect(() => validateString('Too long string', 'name', { max: 5 })).toThrow(
        ValidationError
      );
    });

    it('should reject missing or empty required fields', () => {
      expect(() => validateRequired(null, 'field')).toThrow(ValidationError);
      expect(() => validateRequired('', 'field')).toThrow(ValidationError);
      expect(() => validateRequired('ok', 'field')).not.toThrow();
    });
  });

  describe('validateDate', () => {
    it('should parse and validate valid dates', () => {
      const date = validateDate('2026-09-06', 'transaction_date');
      expect(date).toBeInstanceOf(Date);
      expect(isNaN(date.getTime())).toBe(false);
    });

    it('should reject invalid dates', () => {
      expect(() => validateDate('not-a-date', 'transaction_date')).toThrow(
        ValidationError
      );
    });
  });

  describe('validateEnum', () => {
    it('should accept allowed enum values', () => {
      const type = validateEnum('INCOME', ['INCOME', 'EXPENSE'] as const, 'type');
      expect(type).toBe('INCOME');
    });

    it('should reject invalid enum values', () => {
      expect(() =>
        validateEnum('TRANSFER', ['INCOME', 'EXPENSE'] as const, 'type')
      ).toThrow(ValidationError);
    });
  });
});
