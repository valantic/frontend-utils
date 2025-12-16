export type FormatPriceOptionsType = {
  value: number;
  isValueCentAmount?: boolean;
  currencyBefore?: boolean;
  currencyAfter?: boolean;
  locale?: string;
  currency?: string;
};

/**
 * Formats a numeric price value according to project standards.
 *
 * This function takes a numeric `value` (representing a price) and formats it
 * as a string based on the provided options. It can handle prices given in
 * cents (`isValueCentAmount`), append a currency symbol before or after the
 * formatted price, and adjust formatting based on the specified locale.
 *
 * @param {FormatPriceOptionsType} options - The options for formatting the price.
 * @param {Number} options.value - The numeric value to format. If `isValueCentAmount` is true, the value is treated as cents.
 * @param {Boolean} [options.isValueCentAmount=false] - Whether the value represents cents. If true, the value is divided by 100 before formatting.
 * @param {Boolean} [options.currencyBefore=false] - Whether to prepend the currency symbol to the formatted price.
 * @param {Boolean} [options.currencyAfter=false] - Whether to append the currency symbol to the formatted price.
 * @param {String} [options.locale='de-CH'] - The locale to use for formatting (e.g., 'de-CH' for Swiss German or 'en-US' for US English).
 * @param {String} [options.currency='CHF'] - The currency symbol to use (e.g., 'CHF', 'USD', 'EUR').
 *
 * @returns {String} - The formatted price as a string, including the currency symbol if specified.
 *
 * @example @see /test/helpers/format-price.test.ts
 */
export default function formatPrice({
  value,
  isValueCentAmount = false,
  currencyBefore = false,
  currencyAfter = false,
  locale = 'de-CH',
  currency = 'CHF',
}: FormatPriceOptionsType): string {
  if (Number.isNaN(value)) {
    return '';
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const valueToFormat = isValueCentAmount ? value / 100 : value;
  const formattedPrice = formatter.format(valueToFormat);
  const before = currencyBefore ? `${currency} ` : '';
  const after = currencyAfter ? ` ${currency}` : '';

  return `${before}${formattedPrice}${after}`;
}
