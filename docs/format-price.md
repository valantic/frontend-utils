# formatPrice

`src/helpers/format-price.ts` — formats a numeric price as a string, with optional currency and locale.

## Usage

```ts
import formatPrice, { FormatPriceOptionsType } from '@valantic/frontend-utils/src/helpers/format-price';

formatPrice({ value: 1123.45 }); // "1’123.45" (default locale 'de-CH', 2 decimals, no currency)
formatPrice({ value: 1999, isValueCentAmount: true, currencyAfter: true }); // "19.99 CHF"
formatPrice({ value: 1123.45, currencyBefore: true, locale: 'en-US', currency: 'USD' }); // "USD 1,123.45"
```

`FormatPriceOptionsType`:

- `value` (required) — the numeric price.
- `isValueCentAmount` (default `false`) — when `true`, `value` is divided by 100 before formatting (e.g. cents to
  a currency unit).
- `currencyBefore` / `currencyAfter` (default `false` each) — prepend/append `${currency} `. Both can be set at
  the same time, which prints the currency on both sides.
- `locale` (default `'de-CH'`) — passed to `Intl.NumberFormat`, so it drives grouping/decimal separators (e.g.
  `de-CH` uses `’` as the thousands separator, `en-US` uses `,`).
- `currency` (default `'CHF'`) — a plain string prefixed/suffixed as text; it is **not** passed to
  `Intl.NumberFormat`'s `currency` formatting (there is no `style: 'currency'`), so any string works, not just
  ISO currency codes.

## Behavior notes

- Formatting always uses `style: 'decimal'` with exactly 2 fraction digits, regardless of `currency`.
- `Number.isNaN(value)` returns `''` (empty string) instead of formatting `"NaN"`.
- Negative values are formatted with the locale's own minus sign (e.g. `-12’345.00`); there is no separate
  handling for negative amounts.
- With neither `currencyBefore` nor `currencyAfter` set, the result is just the formatted number, with no
  currency text at all.
