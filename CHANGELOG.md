# valantic javascript utils

## unreleased

- Moved all helper functions from the vue-template repo to this one and added tests for them.
- Added `createFetchInstance` (`src/helpers/create-fetch-instance.ts`), a dependency-free `fetch`-based HTTP client
  (axios-like ergonomics: instance defaults, base URL resolution, query param serialization, XSRF header forwarding,
  timeouts and retries) moved here from vue-template's axios removal, so it can be reused and versioned across
  projects.
