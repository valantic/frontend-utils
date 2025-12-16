import { describe, expect, it } from 'vitest';
import propScale from '@/helpers/prop-scale';

describe('propScale', () => {
  it('should create a validator in development mode', () => {
    const config = propScale(1, [1, 2, 3], 'development');

    // Validator should be defined
    expect(config.validator).toBeDefined();
    // Validator should correctly validate valid numbers
    expect(config.validator?.('2')).toBe(true); // Valid number
    expect(config.validator?.('5')).toBe(false); // Invalid number
  });

  it('should not create a validator in production mode', () => {
    const config = propScale(1, [1, 2, 3]);

    // Validator should be undefined in production mode
    expect(config.validator).toBeUndefined();
  });

  it('should throw an error if validNumbers is not an array in development mode', () => {
    // Pass an invalid validNumbers argument
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => propScale(1, 'not-an-array' as any, 'development')).toThrow("'validNumbers' is not an array.");
  });

  it('should throw an error if defaultValue is not a number in development mode', () => {
    // Pass an invalid defaultValue argument
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => propScale('1' as any, [1, 2, 3], 'development')).toThrow("'defaultValue' is not a Number.");
  });

  it('should default envMode to production when not provided', () => {
    const config = propScale(1, [1, 2, 3]);

    // Validator should be undefined when envMode defaults to 'production'
    expect(config.validator).toBeUndefined();
  });

  it('should correctly validate edge case valid numbers', () => {
    const config = propScale(0, [0, 100, 999], 'development');

    // Validator should correctly validate edge cases
    expect(config.validator?.('0')).toBe(true); // Valid number (edge case)
    expect(config.validator?.('100')).toBe(true); // Valid number
    expect(config.validator?.('999')).toBe(true); // Valid number
    expect(config.validator?.('-1')).toBe(false); // Invalid number
    expect(config.validator?.('1000')).toBe(false); // Invalid number
  });

  it('should handle empty validNumbers array properly', () => {
    const config = propScale(1, [], 'development');

    // Validator should reject all values since validNumbers is empty
    expect(config.validator?.('1')).toBe(false);
    expect(config.validator?.('0')).toBe(false);
    expect(config.validator?.('100')).toBe(false);
  });
});
