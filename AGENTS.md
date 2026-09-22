# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, Cursor, Copilot, etc.) when working with code in
this repository.

## What this is

`@valantic/frontend-utils` is a small, dependency-free library of standalone JS/TS helper functions. It is consumed by
other valantic projects (e.g. `vue-template`) via a GitHub dependency reference
(`github:valantic/frontend-utils#<version>`), not published to the npm registry as a built package — there is no build
step, `main`, or `exports` field in `package.json`. Consumers import directly from `src/`.

## Commands

- `npm test` — runs lint + unit tests (`npm run lint && npm run test:unit -- --watch=false`). This is the full check to
  run before considering work done.
- `npm run lint` — ESLint only (`eslint ./`).
- `npm run test:unit` — Vitest only, run from `tests/` dir. To run a single test file:
  `npm run test:unit -- tests/helpers/debounce.test.ts`. To run a single test by name:
  `npm run test:unit -- -t "should cancel a scheduled debounced call"`.
- `npm run prettier` — formats the whole repo in place.
- `npm run clean:caches` — clears stylelint/node_modules caches.

Releases (`npm run release[:minor|:major]`) bump the version and push tags — do not run these unless explicitly asked.

## Architecture

- Every helper lives as its own file in `src/helpers/<kebab-case-name>.ts`, with a `default export` of a single function
  (see `src/helpers/debounce.ts`, `format-price.ts`). There is no barrel/index file re-exporting everything — each
  helper is imported by its own path.
- Each helper has a matching test at `tests/helpers/<kebab-case-name>.test.ts`, mirroring the `src/helpers` structure 1:
  1. Every existing helper has a test; new helpers should too.
- The `@/*` path alias maps to `src/*` (configured identically in `tsconfig.json` and `vitest.config.ts`) and is used in
  tests to import from source, e.g. `import debounce from '@/helpers/debounce';`.
- Helpers are documented with a full JSDoc block above the function (description, `@template`/`@param`/`@returns`, and
  an `@example @see /tests/helpers/<name>.test.ts` pointing at its test file instead of inline example code).
- Options objects for helpers with multiple parameters are typed as an exported `<Name>OptionsType` type declared just
  above the function (see `FormatPriceOptionsType` in `format-price.ts`).
- Linting combines base ESLint, `typescript-eslint`, and the shared `eslint-config-valantic` presets (typescript, vue,
  prettier-vue) from `eslint.config.js` — don't add ad-hoc rule overrides without reason; a couple of narrow overrides
  already exist there (`unicorn/prevent-abbreviations`, `vue/no-unsupported-features`, etc.).
- Tests run in `jsdom` via Vitest; use `vi.fn()`/fake timers as needed for helpers like `debounce` that depend on
  `setTimeout`.

## Documentation

This repo keeps its own feature docs in a `docs/` folder (with an index at `docs/README.md`) — this is separate from
the workspace-level `docs/` at the root of `valantic/` and must not be skipped in favor of it.

- Every helper (or a small group of closely related helpers, e.g. `apiRequest` + `ApiError`) gets one Markdown file
  under `docs/` covering usage, options, and any non-obvious behavior or migration notes that go beyond what the
  JSDoc block on the function itself documents.
- When adding, changing, or removing a helper, update the matching doc in the same change — do not defer it to a
  follow-up task.
- `docs/README.md` is the index; add a one-line link to every new doc file there.
