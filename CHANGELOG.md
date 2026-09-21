# valantic javascript utils

## unreleased

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
