# frontend-utils docs

Feature docs for this package, one file per helper (or small group of closely related helpers). See
[AGENTS.md](../AGENTS.md) for the convention.

- [apiRequest](./api-request.md) — `fetch`-based HTTP request helper (usage, response parsing,
  timeouts, cancellation, limitations)
- [dedupeRequest](./dedupe-request.md) — in-flight request de-duplication/cancellation wrapper around
  `apiRequest`
