# debounce

`src/helpers/debounce.ts` — creates a debounced version of a function, returned as `{ debounced, cancel }`.

## Usage

```ts
import debounce from '@valantic/frontend-utils/src/helpers/debounce';

const { debounced, cancel } = debounce(() => fetchSuggestions(query), 300);

input.addEventListener('input', debounced);
// later, e.g. on component unmount:
cancel();
```

- `func` — the function to debounce. Its return value is ignored, so it can be sync or async.
- `delay` — milliseconds to wait for a quiet period before calling `func`.
- `immediate` (default `false`) — see below.

### Trailing vs. leading edge

With `immediate: false` (the default), `debounced()` only calls `func` on the **trailing edge**: each call resets
a `delay`-length timer, and `func` runs once, with the arguments of the _last_ call, after activity stops for
`delay` ms. Calls made while the timer is pending do not call `func` at all.

With `immediate: true`, `debounced()` calls `func` immediately on the **leading edge** of a burst (the first call
after an idle period) and ignores further calls until `delay` ms have passed without a call — there is no trailing
call in this mode, so a rapid burst of calls only ever invokes `func` once, right at the start.

### `cancel()`

Clears the pending timer, preventing a scheduled trailing-edge call from firing. It has no effect once `func` has
already run (immediate mode's leading call, or a trailing call after the delay has already elapsed).
