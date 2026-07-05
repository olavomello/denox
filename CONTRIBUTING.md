# Contributing to Denox

Thank you for contributing! Denox follows **Specification Driven Development**: read `AGENTS.md`
first — it is the authoritative engineering contract for both humans and AI agents.

## Workflow

1. Open (or pick) an issue describing the feature or fix.
2. Write the specification in `specs/<feature-name>.md` using `specs/_TEMPLATE.md`. Set
   `status: draft`.
3. Wait for a maintainer to review and change the frontmatter to `status: approved`. **No
   implementation code before approval.**
4. Follow the SDD steps: architecture → plan → implementation → tests → docs.
5. Open a pull request. CI must be green.

## Quality gate (must pass locally before pushing)

```bash
deno task ci
```

This runs: `fmt:check`, `lint`, `routes`, `check`, and the full test suite.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(users): add pagination to user listing
fix(rate-limit): honor X-Forwarded-For behind proxies
docs(deploy): document Caddy setup
```

## Code standards

- TypeScript strict mode; no `any`; `unknown` at trust boundaries.
- Every public element documented (see AGENTS.md > Comments).
- Constructor injection; depend on interfaces, not implementations.
- No `console.*` outside `src/shared/logger.ts`.
- Never edit `src/frontend/pages.gen.ts` by hand.
