# loadScript

`src/helpers/load-script.ts` — dynamically injects a `<script>` tag into `document.head`, loading a given URL at
most once and letting multiple callers register a callback for the same script.

## Usage

```ts
import loadScript from '@valantic/frontend-utils/src/helpers/load-script';

loadScript('https://example.com/widget.js', () => {
  window.Widget.init();
});

// with custom script attributes
loadScript('https://example.com/widget.js', undefined, { 'type': 'module', 'data-consent': 'true' });
```

- `scriptSrc` — the script URL. Used both as the `src` and as the de-duplication key (matched via
  `document.querySelector('script[src="..."]')`).
- `callback` (optional) — called once the script has loaded (or errors — see below).
- `attributes` (optional) — extra attributes to set on the `<script>` element (e.g. `type`, `crossorigin`,
  `integrity`, `referrerpolicy`, or any custom `data-*` attribute). `defer` and `async` default to `true` each and
  can be overridden here.

### De-duplication and callback queuing

- If no `<script>` with that `src` exists yet, one is created, appended to `document.head`, and tracked internally
  (exported as `scriptMapping`, a shared `{ loadingQueue: string[]; callbacks: { id; callback }[] }` object).
- If a call for the same `scriptSrc` comes in while it's still loading, the new `callback` is queued rather than
  adding a second `<script>` tag; all queued callbacks fire once the script's `load` event fires.
- If a call comes in for a `scriptSrc` that already has a matching `<script>` tag in the DOM but is **not** in
  `scriptMapping.loadingQueue` (i.e. it was added outside `loadScript`, or has already finished loading), the
  callback runs synchronously and immediately, without waiting for any event.

### Error handling

The script's `error` event runs the same queued callbacks as `load` (and does the same cleanup) — `loadScript`
does not distinguish a failed load from a successful one for callback purposes, and the callback receives no
error information either way.

## Limitations

- There is no way to remove/unload a script once injected, and no returned promise or handle — `loadScript` is
  fire-and-forget.
- `scriptMapping` is module-level shared state; it is exported mainly to make loading in progress observable and
  for tests, not intended to be mutated directly by consumers.
