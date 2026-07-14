---
feature: cli
status: draft
author: olavomello
reviewed_by:
date: 2026-07-13
---

# `denox` CLI — Specification (0.9)

## Objective

Turn the clonable scaffold into an installable product: a zero-dependency command line — `denox new`
scaffolds a fresh project, `denox generate` produces feature slices and pages that follow every
house convention (MVC slice, tests, OpenAPI description, explicit registration) — so the distance
from idea to running endpoint is one command.

## Scope

### In scope

**1. Distribution — `cli/main.ts`, self-contained**

The CLI lives in the repo but imports nothing from `src/` (no `@/` map — it must run remotely):
std-free argument parsing, embedded templates.

```bash
# run without installing
deno run -A https://raw.githubusercontent.com/olavomello/denox/main/cli/main.ts new my-shop

# or install once
deno install -grA -n denox https://raw.githubusercontent.com/olavomello/denox/main/cli/main.ts
denox new my-shop
```

(JSR publication remains a 1.0 item; the raw URL works today.)

**2. `denox new <name>`**

- `git clone --depth 1` of the template repo (git required — clear error when absent; tarball
  fallback is a noted future option) into `<name>/`;
- fresh start: removes `.git`, runs `git init`, resets `VERSION` to `0.1.0` and `CHANGELOG.md` to an
  empty Unreleased section;
- personalizes `denox.config.ts` (`app.name`/`shortName` from the project name; `--url=<prod-url>`
  optional flag) and `README.md` title;
- prints next steps (cp .env.example .env, deno task dev, first signup = admin).

**3. `denox generate feature <name>` (alias `g feature`)**

Generates a complete API slice in `src/api/<name>/` from embedded templates — the creating-a-feature
guide, mechanized:

- `model` / `dto` (validated create payload) / `repository` (interface + in-memory) /
  `repository.kv` (Deno KV with the id key pattern) / `service` / `controller` / `routes` —
  including a colocated `registerOpenApiPaths` block (list/create/get to start) so the parity test
  passes from minute one;
- `test/integration/<name>_test.ts` skeleton (create/list/get round trip);
- **auto-registration**: inserts the import + `register<Name>Routes(api)` at the `// denox:features`
  anchor in `src/api/main.ts` (anchor added in this cycle); if the anchor is missing (user edited it
  away), prints the two lines to paste instead — never guesses at foreign code;
- name hygiene: kebab/camel/Pascal derivations from one input, collision check (existing folder →
  abort), reserved names rejected.

**4. `denox generate page <route>`**

Creates `src/frontend/pages/<route>.ts` (config + meta + render fn, `[param]` supported) and runs
`deno task routes`.

**5. `denox help` / `denox version`** (version read from the local project's `VERSION` when inside
one, CLI's own otherwise).

### Out of scope

JSR publication, `denox upgrade`, interactive prompts (flags only), migration/cron/layout generators
(future `generate` targets), tarball download fallback, Windows-specific installers, plugin system.

## Functional Requirements

- FR-1: `new` produces a project that passes `deno task ci` untouched, with fresh git history, reset
  VERSION/CHANGELOG and personalized name.
- FR-2: `generate feature widgets` inside a project yields a slice whose files type-check, whose
  routes register (anchor path) and whose OpenAPI descriptions satisfy the parity test;
  `deno task test` passes with the generated skeleton test.
- FR-3: generating an existing feature aborts with a clear error; invalid names (non
  `[a-z][a-z0-9-]*`) are rejected.
- FR-4: missing anchor → files still generated, wiring lines printed, exit 0 with a warning.
- FR-5: `generate page docs/faq` creates the page and the route table includes `/docs/faq` after
  regeneration.
- FR-6: unknown commands/flags print help and exit 1.

## Non Functional Requirements

- NFR-1: zero dependencies (no std imports — remote execution stays a single-file fetch); templates
  embedded as string constants.
- NFR-2: never overwrites existing files; every write is logged.
- NFR-3: works from the repo (`deno task cli ...`) and from the raw URL.

## Security Considerations

`new` clones only the official template URL by default (`--template=` flag documented as "trust what
you point at"); generators write only inside the current project (path-traversal guard on names); no
network access except `new`'s clone.

## Tests

Unit: name derivations, argument parser, template rendering (placeholders resolved, none left).
Integration: `generate feature` into the repo under a temp name → generated files pass
`deno check` + parity, then cleaned up; anchor-missing fallback; collision/invalid-name errors;
`generate
page` + route regen. `new` is covered by a gated e2e (network + git) excluded from default
CI, documented. Estimated +10–12 tests.

## Documentation

`docs/cli.md` (install, commands, template flag), README (install one-liner in Quick Start + feature
bullet), guide cross-link ("mechanized by `denox g feature`"), CHANGELOG, ROADMAP check-off.
