# scrollbarWidth

`src/helpers/scrollbar-width.ts` — returns the browser's current scrollbar width in pixels.

## Usage

```ts
import scrollbarWidth from '@valantic/frontend-utils/src/helpers/scrollbar-width';

const width = scrollbarWidth(); // e.g. 17
```

It takes no arguments and computes `window.innerWidth - document.documentElement.clientWidth` on every call — the
difference between the viewport width including scrollbars and the width excluding them. It requires a
browser-like environment (`window`/`document`); it is not memoized/cached, so it re-reads both values each time
it's called, reflecting the current layout (e.g. after a scrollbar appears or disappears).
