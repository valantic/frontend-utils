# valantic javascript utils

## unreleased

- [DOCS] Added a Documentation section to AGENTS.md requiring feature docs to live in this repo's own `docs/` folder
  (indexed by `docs/README.md`), separate from the workspace-level `docs/`.
- Moved all helper functions from the vue-template repo to this one and added tests for them.
- Added `apiRequest` (`src/helpers/api-request.ts`), a dependency-free `fetch`-based HTTP request function (JSON body
  handling, query param serialization matching axios' prior `key[]=value` format, combined abort/timeout signals via
  native `AbortSignal.any()`/`.timeout()`, a 30s default timeout, and an `ApiError` carrying the parsed response body)
  moved here from vue-template's axios removal, so it can be reused and versioned across projects. Replaces the
  previously added `createFetchInstance` helper (superseded before release — see the vue-template branch comparison
  in `docs/shared-frontend/axios-to-fetch-helper-migration.md` at the workspace root for why).
- `apiRequest`'s default timeout stays 30s (`API_DEFAULT_TIMEOUT`) but is now configurable: pass `defaultTimeout` in
  its `options` to change the fallback for all calls made through that call site, without needing a `config.timeout`
  on every request. Precedence: `config.timeout` > `options.defaultTimeout` > `API_DEFAULT_TIMEOUT`; `0` still
  disables the timeout entirely at either level.
- Added `dedupeRequest` (`src/helpers/dedupe-request.ts`), a generic request de-duplication wrapper keyed by a
  caller-chosen `uniqueId`: aborts any previous in-flight request sharing that id, registers the new one, and cleans
  up automatically. Because it wraps any `send` function rather than a specific HTTP method, the same de-duplication
  now applies uniformly across `GET`/`POST`/`PUT`/`PATCH`/`DELETE` (or any custom call), instead of being hand-rolled
  per method per project (previously only `get()` supported it in vue-template). Also fixes a related bug ported
  unchanged from the old axios-based `api.ts`: a caller-supplied `config.signal` is now preserved and combined with
  the de-duplication signal, rather than silently discarded when a `uniqueId` is also given.
- `apiRequest` now accepts `config.responseType` (`'json' | 'text' | 'blob' | 'arraybuffer'`) for binary downloads or
  strict JSON parsing. Applies to both success and error responses, so `error.response.data` matches the same shape.
  Leaving it unset keeps the existing default behavior (read as text, attempt `JSON.parse`, fall back to the raw
  text) unchanged. Restores the response-type support dropped when `createFetchInstance` was superseded by
  `apiRequest`.
