# clone

`src/helpers/clone.ts` — deep-clones a JSON-serializable value using `JSON.stringify`/`JSON.parse`.

## Usage

```ts
import clone from '@valantic/frontend-utils/src/helpers/clone';

const original = { one: { two: 42 } };
const copy = clone(original);

copy.one !== original.one; // true — nested objects are cloned too, not just the top level
```

`value` can be any type; `clone(undefined)` returns `undefined` without going through
`JSON.stringify`/`JSON.parse` (which would otherwise drop it).

## Limitations

Because it's built on `JSON.stringify`/`JSON.parse`, `clone` inherits that mechanism's limits:

- **Non-serializable values are dropped**, not cloned. A function-valued property is omitted entirely from the
  result (`{ one: 1, two: () => 'hi' }` clones to `{ one: 1 }`).
- **Circular references throw.** `JSON.stringify` throws a `TypeError` when the value (directly or transitively)
  references itself.
- **`Date` instances become ISO strings**, not `Date` objects — `clone({ date: new Date() })` returns
  `{ date: '2025-...T...Z' }`, a plain string.
- Anything else `JSON.stringify` can't represent (e.g. `undefined` inside an object/array, symbols, `BigInt`) is
  either omitted or throws, following `JSON.stringify`'s own rules.
