import { describe, expect, it } from 'vitest';
import formatPrice, { FormatPriceOptionsType } from '@/helpers/format-price';

describe('formatPrice', () => {
  it('should format the price with default settings', () => {
    const options: FormatPriceOptionsType = {
      value: 1123.45,
    };
    const result = formatPrice(options);

    expect(result).toBe('1’123.45');
  });

  it('should format the price with currency before the value', () => {
    const options: FormatPriceOptionsType = {
      value: 1123.45,
      currencyBefore: true,
    };
    const result = formatPrice(options);

    expect(result).toBe('CHF 1’123.45');
  });

  it('should format the price for en-US with the default currency before the value', () => {
    const options: FormatPriceOptionsType = {
      value: 1123.45,
      currencyBefore: true,
      locale: 'en-US',
    };
    const result = formatPrice(options);

    expect(result).toBe('CHF 1,123.45');
  });

  it('should format the price with currency before the value and custom currency USD', () => {
    const options: FormatPriceOptionsType = {
      value: 1123.45,
      currencyBefore: true,
      locale: 'en-US',
      currency: 'USD',
    };
    const result = formatPrice(options);

    expect(result).toBe('USD 1,123.45');
  });

  it('should format the price with currency after the value', () => {
    const options: FormatPriceOptionsType = {
      value: 12345,
      currencyAfter: true,
    };
    const result = formatPrice(options);

    expect(result).toBe('12’345.00 CHF');
  });

  it('should format the price with both currency before and after', () => {
    const options: FormatPriceOptionsType = {
      value: 12345,
      currencyBefore: true,
      currencyAfter: true,
    };
    const result = formatPrice(options);

    expect(result).toBe('CHF 12’345.00 CHF');
  });

  it('should handle different locales', () => {
    const options: FormatPriceOptionsType = {
      value: 12345,
      locale: 'en-US',
    };
    const result = formatPrice(options);

    expect(result).toBe('12,345.00'); // In US locale, `.` is used as the decimal separator
  });

  it('should handle different currencies', () => {
    const options: FormatPriceOptionsType = {
      value: 12345,
      currencyBefore: true,
      currencyAfter: true,
      locale: 'en-US',
      currency: 'USD',
    };
    const result = formatPrice(options);

    expect(result).toBe('USD 12,345.00 USD');
  });

  it('should format zero value correctly', () => {
    const options: FormatPriceOptionsType = {
      value: 0,
    };
    const result = formatPrice(options);

    expect(result).toBe('0.00');
  });

  it('should return an empty string for NaN', () => {
    const options: FormatPriceOptionsType = {
      value: Number.NaN,
    };
    const result = formatPrice(options);

    expect(result).toBe('');
  });

  it('should format negative values correctly', () => {
    const options: FormatPriceOptionsType = {
      value: -12345,
    };
    const result = formatPrice(options);

    expect(result).toBe('-12’345.00');
  });

  it('should normalize apostrophes in formatted price for de-CH locale', () => {
    const options: FormatPriceOptionsType = {
      value: 12345,
      locale: 'de-CH',
    };
    const result = formatPrice(options);

    expect(result).toBe('12’345.00'); // Ensure apostrophes are normalized in formatting
  });

  it('should format prices with high precision values', () => {
    const options: FormatPriceOptionsType = {
      value: 123456789,
      locale: 'en-US',
    };
    const result = formatPrice(options);

    expect(result).toBe('123,456,789.00');
  });

  it('should handle edge case: very small values', () => {
    const options: FormatPriceOptionsType = {
      value: 5,
    };
    const result = formatPrice(options);

    expect(result).toBe('5.00'); // Smallest unit formatted correctly
  });

  it('should handle edge case: very large values', () => {
    const options: FormatPriceOptionsType = {
      value: 12345678912345,
    };
    const result = formatPrice(options);

    expect(result).toBe('12’345’678’912’345.00');
  });

  it('should retain proper formatting with default behavior for large values', () => {
    const options: FormatPriceOptionsType = {
      value: 12345678,
      currencyBefore: true,
      locale: 'de-CH',
      currency: 'CHF',
    };
    const result = formatPrice(options);

    expect(result).toBe('CHF 12’345’678.00');
  });
});
