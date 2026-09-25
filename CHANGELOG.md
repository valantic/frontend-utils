# valantic javascript utils

## unreleased

- [CHORE] Bumped `engines.node` to `>=22 <26` (was `>=22 <25`) to allow Node 25. Added `.nvmrc` (pinned to `25`) and
  `.npmrc` (`save-prefix=~`, `legacy-peer-deps=true`, `engine-strict=true`, `min-release-age=7`,
  `ignore-scripts=true`). Removed the `.gitignore` rule that previously excluded `.nvmrc` so it can be committed.

- Replaced the ad hoc "🚀🚀 Check project" workflow with a standard "CI Test" workflow (PR + push triggers,
  `actions/checkout@v7`, `actions/setup-node@v7`, Node 25, `npm ci`), matching the other shared-frontend repos.
- Streamlined `.github/PULL_REQUEST_TEMPLATE.md` by removing the obsolete checklist sections.
- Added a local `id-length` override in `eslint.config.js` allowing `ok` as an identifier (used in `api-request.ts`
  for `Response#ok`). Quickfix until `eslint-config-valantic` releases this upstream and the dependency is bumped,
  at which point this override can be removed.
- Added a `files` allow-list (`["src"]`) to `package.json` so installing via the `github:` dependency reference only
  pulls `src/` (plus `package.json`, `LICENSE`, `README.md`) — dev/test files, `docs/`, and config are no longer
  installed by consumers.
- [DOCS] Added a Documentation section to AGENTS.md requiring feature docs to live in this repo's own `docs/` folder
  (indexed by `docs/README.md`), separate from the workspace-level `docs/`.
- [DOCS] Added `docs/api-request.md` and `docs/dedupe-request.md` (plus a `docs/README.md` index) covering usage,
  behavior, and limitations of `apiRequest` and `dedupeRequest`.
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
- `apiRequest` no longer parses a non-2xx response with a `'blob'`/`'arraybuffer'` `responseType` when the response's
  own `Content-Type` indicates a JSON/text/XML body — it parses as JSON/text instead, so `error.response.data` on a
  binary-download endpoint's error is a usable parsed object rather than an unusable `Blob`/`ArrayBuffer`. A
  genuinely binary error body still honors the requested `responseType`. See `resolveErrorResponseType`
  (`src/helpers/api-request.ts`) and `docs/api-request.md`.
- `apiRequest` now wraps its `fetch()` call: a genuine network failure (offline, DNS failure, connection refused,
  CORS block) rejects with an `ApiError` carrying a stable `code: 'ERR_NETWORK'` (mirroring axios' own
  `ERR_NETWORK`), instead of the browser's raw, unwrapped `fetch` rejection. Aborts and timeouts are unaffected —
  `isSilentAbortError` still recognizes those and they continue to reject with the native rejection, not an
  `ApiError`.
