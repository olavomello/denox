# CLI — Architecture

```
cli/main.ts   single self-contained file: argument parsing, name
              derivation, embedded templates, wiring, commands
```

## Decisions

- **Self-contained on purpose**: no `@/` imports, no std imports, no dependencies — the CLI must run
  straight from a raw GitHub URL, so it cannot rely on the project's import map or the network
  beyond `new`'s clone. Templates are string constants.
- **Pure core, thin shell**: `deriveNames`, `parseCli`, `featureFiles`, `insertWiring` and
  `pageFile` are pure and unit-tested; only the command functions touch the filesystem, and `main()`
  returns exit codes instead of calling `Deno.exit` (which is what makes the integration tests
  possible).
- **Generated code must pass the project's own gates**: the integration test generates a slice into
  the repo, runs `deno check` against it, and cleans up — this caught real template bugs (wrong
  envelope path, optional `param()` under `noUncheckedIndexedAccess`).
- **Never guesses at foreign code**: wiring happens at the `// denox:features` anchor; without it
  the CLI prints the lines and exits 0 with a warning rather than editing blindly.
- **Never overwrites**: every write checks first; collisions abort.
