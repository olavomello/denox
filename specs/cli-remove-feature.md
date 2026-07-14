---
feature: cli-remove-feature
status: approved
author: olavomello
reviewed_by: olavomello
date: 2026-07-13
---

# `denox remove feature` — Specification (0.9.x)

## Objective

Close the asymmetry `denox g feature` created: generating a slice wires it into the router, but
deleting the folder by hand leaves an orphaned import and registration behind — which breaks
`deno task check` (observed in practice, on main). Removal must undo exactly what generation did.

## Scope

### In scope

**`denox remove feature <name>` (alias `rm feature`)**

1. **Unwires first, deletes second** — the reverse order of generation, so a failure never leaves a
   router pointing at missing modules:
   - removes the `import { register<Name>Routes } from "@/api/<name>/..."` line and the
     `register<Name>Routes(api);` line from `src/api/main.ts` (pure function `removeWiring`,
     unit-testable, mirroring `insertWiring`);
   - deletes `src/api/<name>/` and `test/integration/<name>_test.ts`.
2. **Refuses to remove what it did not generate**: the built-in slices (`health`, `auth`, `users`,
   `products`, `contact`, `payments`) are rejected with a clear message — they are framework
   surface, not user features.
3. **Safety**: unknown feature → error, exit 1; `--dry-run` prints exactly what would be removed and
   touches nothing; confirmation is **not** interactive (flags only, per the CLI's prompt-free
   design) — the dry-run flag is the guard rail.
4. Reminder printed on success: `deno task insomnia` (the collection still carries the removed
   endpoints until regenerated) and `deno task test`.

### Out of scope

Removing pages (`denox remove page`) — files have no wiring, plain deletion suffices; git-aware
removal (`git rm`); undoing config or migration side effects; recovering deleted code (that is git's
job).

## Functional Requirements

- FR-1: `remove feature widgets` deletes both paths and leaves `src/api/main.ts` with **no trace**
  of the slice (no import, no registration, no blank-line scar), and the project still type-checks.
- FR-2: removing a built-in slice is refused (exit 1, nothing touched).
- FR-3: removing an unknown feature errors (exit 1).
- FR-4: `--dry-run` lists the files and the two wiring lines, changes nothing, exits 0.
- FR-5: `removeWiring` is the exact inverse of `insertWiring` — applying both to a source returns it
  unchanged (property tested).

## Non Functional Requirements

- NFR-1: zero dependencies; the CLI stays a single self-contained file.
- NFR-2: unwire-then-delete ordering, so an interrupted run never leaves a broken router.

## Tests

Unit: `removeWiring` (removes both lines; idempotent when absent; round-trips with `insertWiring`),
built-in guard list. Integration: generate a temp slice → remove it → `src/api/main.ts`
byte-identical to the original and `deno check` passes; dry-run mutates nothing; unknown and
built-in names exit 1. Estimated +5–6 tests.

## Documentation

`docs/cli.md` (remove section + the "regenerate the collection" reminder), CHANGELOG.
