# isElementInViewport

`src/helpers/is-element-in-viewport.ts` — checks whether a DOM element is currently visible in the viewport.

## Usage

```ts
import isElementInViewport from '@valantic/frontend-utils/src/helpers/is-element-in-viewport';

isElementInViewport(element); // full visibility, default spacing
isElementInViewport(element, { top: 20 }); // full visibility, custom top spacing, other sides default
isElementInViewport(element, {}, true); // partial visibility, no spacing
```

- `element` — the `HTMLElement` to check. Passing `null` throws `Error('Invalid element provided. The element
must be a valid DOM node.')`.
- `viewportSpacing` (optional) — a `Partial<{ top; right; bottom; left }>` object shrinking the effective
  viewport bounds by that many pixels on each side. Any side left out falls back to the default
  `{ top: 10, right: 0, bottom: 10, left: 0 }`; the default and the given object are merged, not replaced
  wholesale, so `{ top: 20 }` alone still applies the default `bottom: 10`.
- `partial` (default `false`) — `false` requires the element's bounding box to be fully inside the (spacing-adjusted)
  viewport; `true` only requires some overlap with it.

Visibility is computed from `element.getBoundingClientRect()` against `window.innerHeight`/`window.innerWidth`, so
it reflects the element's position at the moment of the call — call it again (e.g. on scroll) to re-check.
