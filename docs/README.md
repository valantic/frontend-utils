# frontend-utils docs

`@valantic/frontend-utils` is a small, dependency-free collection of standalone JavaScript/TypeScript helper
functions, framework-agnostic and reused across valantic frontend projects. It is not published to npm; consumers
add it as a GitHub dependency (`"@valantic/frontend-utils": "github:valantic/frontend-utils#<tag>"`) and import
directly from source, since there is no build step and no `main`/`exports` field.

Every helper lives in its own file at `src/helpers/<kebab-case-name>.ts`, exported as a `default export`, with
**no barrel/index file** — each helper is imported by its own path:

```ts
import debounce from '@valantic/frontend-utils/src/helpers/debounce';
import formatPrice from '@valantic/frontend-utils/src/helpers/format-price';
```

Helpers that take more than a couple of parameters (or several optional/boolean ones) accept a single options
object instead, typed as an exported `<Name>OptionsType` (e.g. `FormatPriceOptionsType`) declared just above the
function — see [format-price.md](./format-price.md) for the pattern.

This directory holds the feature docs for this package, one file per helper (or small group of closely related
helpers). See [AGENTS.md](../AGENTS.md) for the full documentation convention.

- [apiRequest](./api-request.md) — `fetch`-based HTTP request helper (usage, response parsing,
  timeouts, cancellation, limitations)
- [dedupeRequest](./dedupe-request.md) — in-flight request de-duplication/cancellation wrapper around
  `apiRequest`
- [clone](./clone.md) — deep-clones a JSON-serializable value
- [debounce](./debounce.md) — delays calling a function until activity stops; returns `{ debounced, cancel }`
- [formatPrice](./format-price.md) — formats a numeric price per locale/currency options
- [isElementInViewport](./is-element-in-viewport.md) — checks full or partial visibility of a DOM element
- [loadScript](./load-script.md) — dynamically injects a `<script>` tag once, queuing callbacks for repeated calls
- [processArrayInChunks](./process-array-in-chunks.md) — processes an array sequentially in fixed-size chunks
- [propScale](./prop-scale.md) — builds a Vue-style prop config for a numeric "scale" prop
- [scrollbarWidth](./scrollbar-width.md) — returns the current browser scrollbar width in pixels
