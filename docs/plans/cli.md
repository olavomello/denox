# CLI — Implementation Plan

1. `// denox:features` anchor in `src/api/main.ts`.
2. `cli/main.ts`: pure core (names, argv, templates, wiring, page) + command shell (`new`,
   `generate feature|page`, `help`, `version`), `main()` returning exit codes.
3. Tasks: `cli` (run from the repo); `check` covers `cli/main.ts`; test tasks gain
   `--allow-write=src,test` for the generator integration test.
4. Tests: unit (derivations, parser, template completeness, wiring, page routes) + integration
   (generate into the repo → files land → wiring → `deno check` → cleanup; anchor-missing fallback;
   collision and invalid-name exit codes; unknown command).
5. Docs (cli, architecture), README install one-liner + feature bullet, guide cross-link, CHANGELOG,
   ROADMAP check-off.
