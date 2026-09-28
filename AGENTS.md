# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, Cursor, Copilot, etc.) when working with code in
this repository.

## What this is

`@valantic/frontend-utils` is a small, dependency-free library of standalone JS/TS helper functions. It is consumed by
other valantic projects (e.g. `vue-template`) via a GitHub dependency reference
(`github:valantic/frontend-utils#<version>`), not published to the npm registry as a built package — there is no build
step, `main`, or `exports` field in `package.json`. Consumers import directly from `src/`. `package.json`'s `files`
field limits what gets installed via the `github:` reference to `src` (plus `package.json`, `LICENSE`, `README.md`,
which npm always includes) — dev/test files, `docs/`, and config are excluded.

## Commands

- `npm test` — runs lint + unit tests (`npm run lint && npm run test:unit -- --watch=false`). This is the full check to
  run before considering work done.
- `npm run lint` — ESLint only (`eslint ./`).
- `npm run test:unit` — Vitest only, run from `tests/` dir. To run a single test file:
  `npm run test:unit -- tests/helpers/debounce.test.ts`. To run a single test by name:
  `npm run test:unit -- -t "should cancel a scheduled debounced call"`.
- `npm run prettier` — formats the whole repo in place.
- `npm run clean:caches` — clears stylelint/node_modules caches.

`npm run release[:minor|:major]` — runs `scripts/release.mjs` (shared, identical in every shared-frontend repo):
checks for a clean, up-to-date `main` and a non-empty `## unreleased`, bumps the version, renames
`## unreleased` to `## vX.Y.Z`, updates the README version pin, commits, creates the annotated `vX.Y.Z` tag and
pushes. The `Release` workflow (`.github/workflows/release.yml`) then creates the GitHub release from that
changelog section. See `CONTRIBUTING.md`. **Never run a release script or `npm publish` unless explicitly
asked.**

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

## Code conventions

Follow the repo's ESLint/Stylelint/Prettier config and `.editorconfig`. On top of that:

- Naming: files `kebab-case`; types, interfaces and enums `PascalCase`; functions, properties and variables
  `camelCase`. Singular names for single things (types, enums, components, stores), plural only for collections. Use
  whole, descriptive words — identifiers have at least 3 characters (`id-length`), except the ones whitelisted in the
  ESLint config.
- TypeScript: never use `any` — use `unknown` plus narrowing or a generic; if `any` is unavoidable, isolate it and
  comment why. Use `type` for object shapes; `interface` only for features exclusive to it, without an `I` prefix.
- Control flow: no `while` or plain `for` loops (use array methods, or `for...of` when `await`/`break`/`continue` is
  needed), no `switch` (use object literals or `if`/`else`), no one-line `if` bodies.
- Comments only where the code is not self-explanatory, in JSDoc style.

valantic developers find the full guidelines in the internal ai-cornerstone repository (`guidelines/frontend/`, skills
`frontend-best-practices` and `vue-best-practices`).

## Working rules

These rules are identical in every valantic shared-frontend repo.

- Git: never commit unless explicitly asked. Never push unless explicitly asked in that request. Never pull or
  create/switch branches (`git pull`, `git checkout`, `git switch`, `git branch`, …). Branch names are
  `feature/<name>` or `bugfix/<name>`.
- Never run a release script or `npm publish` unless explicitly asked.
- Never install, update or remove npm packages without approval. Never edit generated or vendored files
  (`node_modules/`, `dist/`, lock files by hand).
- Priorities: correctness, simplicity, consistency with the existing code, maintainability, minimal changes. Prefer the
  smallest correct change.
- Understand the existing code and search for existing implementations before adding new ones; reuse over new
  abstractions. Do not refactor unrelated code, change public APIs, or change behavior outside the task's scope.
- Before finishing, run `npm test` and fix failures caused by the change. Every change gets a changelog entry and,
  where a feature changes, a doc update (see Changelog and Documentation below).
- If a requirement is unclear, ask. If only an implementation detail is unclear, follow the existing patterns in this
  repo.

## Changelog (required for every task)

`CHANGELOG.md` follows the convention shared by all valantic shared-frontend repos.

- Every change that alters behavior, fixes a bug, or adds/removes something consumers can see gets one entry under
  `## unreleased` in the same change — do not defer it to a follow-up task.
- Format: `- [type] Description.` — one entry per logical change, kept as a flat list (no "Added"/"Fixed" category
  subheadings), so each entry stays self-contained and merge conflicts can be resolved line by line.
- Allowed prefixes ([Conventional Commits](https://www.conventionalcommits.org/) types): `[feat]`, `[fix]`,
  `[refactor]`, `[perf]`, `[docs]`, `[test]`, `[build]`, `[ci]`, `[chore]`, `[revert]`. Older prefixes in released
  sections (`[ENHANCEMENT]`, `(Change)`, …) are history — do not reuse them and do not rewrite old entries.
- Write the description so it is understandable without the diff: name the affected module and the effect for
  consumers.
- Breaking changes are grouped under a `### Breaking Changes` subheading placed directly under `## unreleased`, above
  the regular entries. They keep their prefix and must end with a **Migration:** sentence stating what consumers
  have to do.
- A change is breaking if it removes/renames a helper file (its import path), or changes a helper's signature,
  return value, thrown errors or exported types in a way existing callers depend on.
- Headings: title `# Changelog`, unreleased section `## unreleased` (exact, lowercase — release tooling matches it
  literally), released sections `## vX.Y.Z`. Only the unreleased section is edited; released sections stay as they
  are.

## Documentation

This repo keeps its own feature docs in a `docs/` folder (with an index at `docs/README.md`) — this is separate from
the workspace-level `docs/` at the root of `valantic/` and must not be skipped in favor of it.

- Every helper (or a small group of closely related helpers, e.g. `apiRequest` + `ApiError`) gets one Markdown file
  under `docs/` covering usage, options, and any non-obvious behavior or migration notes that go beyond what the
  JSDoc block on the function itself documents.
- When adding, changing, or removing a helper, update the matching doc in the same change — do not defer it to a
  follow-up task.
- `docs/README.md` is the index; add a one-line link to every new doc file there.
