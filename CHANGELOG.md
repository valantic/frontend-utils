# valantic javascript utils

## unreleased

- Moved all helper functions from the vue-template repo to this one and added tests for them.
- Added `apiRequest` (`src/helpers/api-request.ts`), a dependency-free `fetch`-based HTTP request function (JSON body
  handling, query param serialization matching axios' prior `key[]=value` format, combined abort/timeout signals via
  native `AbortSignal.any()`/`.timeout()`, a 30s default timeout, and an `ApiError` carrying the parsed response body)
  moved here from vue-template's axios removal, so it can be reused and versioned across projects. Replaces the
  previously added `createFetchInstance` helper (superseded before release — see the vue-template branch comparison
  in `docs/shared-frontend/axios-to-fetch-helper-migration.md` at the workspace root for why).
