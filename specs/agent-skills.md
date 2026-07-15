---
feature: agent-skills
status: refused
author: olavomello
reviewed_by: olavomello
date: 2026-07-13
---

# Agent Skills — Specification (0.x)

## Objective

Package DenoX's hard-won conventions as **Agent Skills** — self-contained
`SKILL.md` folders a coding agent loads on demand — so an agent working in a
DenoX project follows the house rules (feature-slice structure, SDD workflow,
deploy targets) without the human pasting context every time. Crucially, and in
the SDD spirit: the skills are **verified against the real repo by a test**, so
they can never drift into lying about the code they describe.

## Scope

### In scope

**1. Skills tree — `skills/`**

Three focused skills, each a folder with a `SKILL.md` (name + description +
body) plus any reference files:

- **`skills/denox-feature/`** — how to add a feature slice: the MVC file set,
  the KV repository pattern, the colocated OpenAPI description, the
  `deno task cli g feature` shortcut, and the `deno task insomnia` + parity
  obligations. Distilled from `docs/guides/creating-a-feature.md`.
- **`skills/denox-sdd/`** — the Specification Driven Development workflow: spec
  in `specs/`, approval mechanism (`status: approved`, `reviewed_by`), then the
  architecture → plan → implementation → tests → docs cycle in one patch.
  Distilled from `AGENTS.md`.
- **`skills/denox-deploy/`** — the deploy targets (Deno Deploy, Fly, Railway,
  Render, Docker, VPS), the env-var contract, and the payment keys fail-fast.
  Distilled from the deploy docs.

Each `SKILL.md` carries YAML frontmatter (`name`, `description`) so any loader
can index it, and links to the canonical doc as the source of truth (skills
summarize and point; they never fork the content).

**2. The drift guard — `scripts/verify_skills.ts` + `deno task skills`**

A skill that describes a `deno task` that no longer exists, or a file path that
moved, is worse than no skill. The verifier parses each `SKILL.md` and asserts,
against the actual repo:

- every `deno task <x>` it mentions exists in `deno.json`;
- every repo-relative path it references (`src/...`, `docs/...`) exists on disk;
- required frontmatter (`name`, `description`) is present and the name matches
  the folder.

Run as a task and **in the suite** (an integration test invokes the verifier),
so a rename that outdates a skill fails CI — the same staleness-gate discipline
as the generated Insomnia collection.

**3. Distribution**

`README` section + `docs/agent-skills.md` explaining what the skills are, how to
point an agent at them, and the "summarize-and-link, never fork" rule.
`AGENTS.md` gains a short pointer (skills are the loadable form of this
contract).

### Out of scope

Publishing skills to any marketplace/registry; `denox g skill` generator (a
later `generate` target if demand appears); skills for other frameworks;
auto-syncing skill bodies from docs (the verifier catches drift; rewriting prose
stays manual); non-Anthropic agent adapters (the `SKILL.md` format is readable
by any agent as plain markdown — no adapter needed).

## Functional Requirements

- FR-1: three `SKILL.md` files exist with valid `name`/`description`
  frontmatter, the name matching the folder.
- FR-2: `deno task skills` exits 0 on a consistent repo and non-zero when a
  skill references a missing task or path.
- FR-3: the verifier is exercised by an integration test (the drift guard runs
  in CI).
- FR-4: every `deno task` and repo path mentioned across the skills resolves —
  proven by FR-2 passing on the committed tree.
- FR-5: each skill links to its canonical doc, and the verifier confirms that
  linked doc exists.

## Non Functional Requirements

- NFR-1: zero dependencies (the verifier is plain Deno: read files, parse
  frontmatter, check existence).
- NFR-2: skills summarize and link; they do not duplicate doc bodies (kept
  short, so drift surface stays small).
- NFR-3: adding a skill is a folder + a line in the verifier's manifest.

## Security Considerations

Skills are documentation; they ship no executable payload. The verifier only
reads files and never writes, so `deno task skills` needs read-only permissions.
Skills must not embed secrets or environment values (the deploy skill references
_names_ of env vars, never values) — the verifier flags any
`sk_`/`whsec_`-looking literal as a guard.

## Tests

Unit: frontmatter parser, task-reference extractor, path-reference extractor.
Integration: the verifier passes on the committed skills; a temp skill
referencing a bogus task/path fails it; the secret-literal guard fires on a
planted `sk_test_...`. Estimated +6–8 tests.

## Documentation

`docs/agent-skills.md`, README section, `AGENTS.md` pointer, CHANGELOG, ROADMAP
(Agent Skills checked off).
