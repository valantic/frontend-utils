# propScale

`src/helpers/prop-scale.ts` — builds a Vue-style prop definition object for a numeric "scale" prop (e.g. a
spacing/size prop restricted to a fixed set of values like `1`, `2`, `3`). It returns a plain configuration object
shaped like a Vue prop definition; it does not import Vue itself.

## Usage

```ts
import propScale from '@valantic/frontend-utils/src/helpers/prop-scale';

// in a component's props definition
props: {
  size: propScale(2, [1, 2, 3, 4], process.env.NODE_ENV),
},
```

`propScale(defaultValue, validNumbers, envMode = 'production')` returns:

```ts
{
  type: [Number, String],
  default: defaultValue,
  validator?(value): boolean, // only present when envMode !== 'production'
}
```

- `defaultValue` — the prop's default value.
- `validNumbers` — the allowed scale values.
- `envMode` (default `'production'`) — when set to anything other than `'production'`, `propScale`:
  - validates its own arguments and throws a `TypeError` if `validNumbers` isn't an array
    (`"'validNumbers' is not an array."`) or `defaultValue` isn't a number (`"'defaultValue' is not a Number."`);
  - adds a `validator` function that parses the incoming prop value with `Number.parseInt(value, 10)` and checks
    it's included in `validNumbers`.

In `'production'` mode (the default), neither the argument checks nor the `validator` run — `type`/`default` are
still returned, but there's no validation at all. This matches Vue's own behavior of skipping prop validators in
production builds, so the check is deliberately skipped there rather than doing redundant work.
