# dedupeRequest

`src/helpers/dedupe-request.ts` — wraps a request function (typically [`apiRequest`](./api-request.md))
with cancel-the-previous-in-flight-request de-duplication, keyed by a caller-chosen id.

## Usage

```ts
import apiRequest from '@valantic/frontend-utils/helpers/api-request';
import dedupeRequest, { AbortStack } from '@valantic/frontend-utils/helpers/dedupe-request';

const abortStack: AbortStack = {};

function search(query: string) {
  return dedupeRequest({
    abortStack,
    uniqueId: 'search', // any previous call with this id is aborted
    send: (config) => apiRequest({ method: 'GET', url: '/api/search' }, { ...config, params: { query } }),
  });
}
```

- `abortStack` is a plain object registry (`Record<string, AbortController>`) owned by the caller —
  typically one instance shared across every request method a consumer exposes (e.g. one per API
  plugin), not one per call.
- `uniqueId` is the de-duplication key. Omit it to run `send` with no de-duplication at all —
  `abortStack` is left untouched in that case.
- `send` performs the actual request; `dedupeRequest` calls it with a `config` whose `signal` is the
  de-duplication signal, combined with any `config.signal` already passed in
  (`DedupeRequestOptions.config`) rather than overwriting it.

Because it wraps `send` instead of hard-coding a specific HTTP method, the same de-duplication
applies uniformly to `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, or any custom call — wrap every method a
consumer exposes, not just reads, to get consistent cancellation everywhere.

## Limitations

- **Cancellation, not queuing or coalescing.** A newer call with the same `uniqueId` always aborts
  the previous one; there is no option to instead wait for/reuse an in-flight request.
- **The registry entry is only cleared when the request that owns it settles**, and only if it's
  still the current entry (a superseded controller's `finally` is a no-op) — the caller must not
  mutate `abortStack` directly outside of `dedupeRequest`, or entries can be left stale.
- **`uniqueId` collisions are the caller's responsibility** — two unrelated calls sharing an id (e.g.
  a copy-pasted string) will silently abort each other.
