# apiRequest

`src/helpers/api-request.ts` — a dependency-free, `fetch`-based HTTP request helper. It replaces the
axios-based transport previously used in `vue-template` with something framework-free that any
consumer (Vue or not) can import and version independently.

## Usage

```ts
import apiRequest, { ApiError } from '@valantic/frontend-utils/helpers/api-request';

const result = await apiRequest(
  { method: 'GET', url: '/api/users', defaultHeaders: { locale: 'de' } },
  { params: { active: true, tag: ['admin', 'editor'] } },
);

result.data; // parsed response body
result.status; // 200
result.ok; // true
```

- `options` (1st argument) describes the request itself: `method`, `url`, optional `data` (request
  body), `defaultHeaders`, and an optional `defaultTimeout` for this call site (see Timeouts below).
- `config` (2nd argument, optional) is the neutral per-request configuration: `headers`, `params`,
  `signal`, `timeout`, `responseType`, and pass-through `fetch` options (`credentials`, `mode`,
  `cache`, `redirect`, `referrerPolicy`).
- There is deliberately no `data`/`body` field on `config` — the body always goes through
  `options.data`, so there is exactly one way to send one.

### Request body

`options.data` is JSON-encoded and given a `Content-Type: application/json` header automatically,
unless it's one of the types `fetch` accepts untouched (`FormData`, `URLSearchParams`, `Blob`,
`ArrayBuffer`, `ReadableStream`, or a plain `string`), in which case it's passed through as-is with
no `Content-Type` forced. A caller-supplied `Content-Type` (or `Accept`) header always wins — it's
never overwritten.

### Query params

`config.params` is serialized into the URL's query string via `buildQueryString`: `undefined`/`null`
entries are dropped, arrays are appended once per element as `key[]=value`, and everything is
percent-encoded through `URLSearchParams` (not string concatenation). It's appended to `options.url`
with `?` or `&` depending on whether the URL already has a query string.

### Errors

A non-2xx response rejects with an `ApiError` (a real `Error` subclass, `error.name === 'ApiError'`)
carrying `status` and `response` — `error.response.data` holds the parsed body, parsed the same way
as a successful response, respecting `responseType` — except a `'blob'`/`'arraybuffer'` request is
overridden when the response's own `Content-Type` indicates a JSON/text/XML body (see Response body
parsing below); a caller-triggered abort or a timeout rejects with the native `AbortController`
rejection unwrapped (see `isSilentAbortError` below). A genuine network failure (offline, DNS
failure, connection refused, CORS block — i.e. `fetch` itself rejecting) instead rejects with an
`ApiError` carrying `code: 'ERR_NETWORK'` and no `status`/`response`, so callers have one stable way
to detect "the request never reached the server" instead of pattern-matching on the browser's own
error message text.

### Response body parsing (`responseType`)

Left unset, the body is read as text and `JSON.parse`d, falling back to the raw text if that fails —
this covers both JSON and plain-text APIs without configuration. Set `config.responseType`
explicitly to:

- `'json'` — strict `response.json()`; rejects if the body isn't valid JSON (a `SyntaxError`, not an
  `ApiError`).
- `'text'` — always the raw text, no `JSON.parse` attempt.
- `'blob'` / `'arraybuffer'` — for binary downloads.

`responseType` is applied to error responses too, so `error.response.data` has the same shape as a
successful `result.data` — **except** a `'blob'`/`'arraybuffer'` request: for a non-2xx response, that
is overridden with the default text/`JSON.parse` behavior whenever the response's `Content-Type`
indicates JSON/text/XML, since an error response is essentially never actually binary regardless of
what the success response would have been (a binary download endpoint's validation/auth failure is
almost always a JSON error body, not binary). A genuinely binary error body (or one with no readable
`Content-Type`) still honors the requested `responseType`. See `resolveErrorResponseType` in
`api-request.ts` for the exact logic.

### Timeouts

Every request has a timeout by default: `config.timeout` (per call) > `options.defaultTimeout` (per
call site, e.g. baked into a wrapper function) > `API_DEFAULT_TIMEOUT` (30s). Pass `timeout: 0` at
either level to disable it entirely. A timeout aborts with a `TimeoutError`-named reason, using the
same signal mechanism as an explicit abort — see `isSilentAbortError`.

### Cancellation

`config.signal` is combined with the internal timeout signal via `combineAbortSignals` (using native
`AbortSignal.any()` where available, with a manual multi-listener fallback otherwise) — a
caller-supplied signal is never silently replaced or ignored. For de-duplicating in-flight requests
by a caller-chosen key (e.g. re-issuing the same search-as-you-type request), see
[`dedupeRequest`](./dedupe-request.md), which wraps `apiRequest` rather than duplicating its logic.

### Telling abort/timeout apart from a real failure

```ts
import apiRequest, { isSilentAbortError } from '@valantic/frontend-utils/helpers/api-request';

try {
  await apiRequest({ method: 'GET', url: '/api/slow' }, { timeout: 2000 });
} catch (error) {
  if (isSilentAbortError(error)) {
    return; // caller aborted, or the request timed out — usually not worth surfacing to the user
  }

  throw error;
}
```

`isSilentAbortError` checks `error.name` (`'AbortError'` or `'TimeoutError'`) rather than
`instanceof DOMException`, since that check is inconsistent across runtimes (browser vs. jsdom).

## Limitations

- **No retries, interceptors, or baseURL.** This is a thin transport, not an axios replacement —
  retry logic, response/request interceptors, and a shared base URL are all the caller's
  responsibility (e.g. wrap `apiRequest` in a project-specific function that prepends a base URL and
  sets `defaultHeaders`, as `vue-template`'s Pinia `api` plugin does).
- **`credentials` defaults to the platform default** (cookies sent for same-origin requests only) —
  set `config.credentials: 'include'` explicitly for cross-origin requests that need cookies.
  `mode`/`cache`/`redirect`/`referrerPolicy` are passed straight through to `fetch` with no
  valantic-specific defaults.
  - When `responseType` is unset and the body parses as neither empty nor valid JSON, `result.data`
  silently becomes the raw response text rather than rejecting — only `responseType: 'json'` gives a
  hard failure on invalid JSON. Don't rely on the default parsing to validate that an API actually
  returned JSON.
- **An abort/timeout is not an `ApiError`** — only a non-2xx HTTP response or a genuine network
  failure (`code: 'ERR_NETWORK'`) is. Code that branches on `error instanceof ApiError` to read
  `error.response.data` must also check `error.response` is defined (network failures carry no
  `response`, only `code`), and have a separate branch (or use `isSilentAbortError`) for abort/timeout
  failures, which are neither an `ApiError` nor carry a `response`.
- **No progress events or streaming upload/download support** beyond what raw `fetch` already offers
  (e.g. reading `Response.body` yourself) — `apiRequest` always awaits the full body via
  `parseResponseBody`.
- **`options.data` type-checks as `unknown`** — passing a non-serializable value (e.g. one containing
  a circular reference, or a `BigInt`) fails at `JSON.stringify` with that function's normal
  `TypeError`, not a helper-specific error.
