# CLI

`denox` scaffolds projects and generates code that follows every house convention — MVC slice,
tests, OpenAPI description, explicit registration.

## Install

```bash
deno install -grA -n denox https://raw.githubusercontent.com/olavomello/denox/main/cli/main.ts
```

Or run it without installing:

```bash
deno run -A https://raw.githubusercontent.com/olavomello/denox/main/cli/main.ts new my-shop
```

The CLI is a single self-contained file (no dependencies, nothing imported from `src/`), so the raw
URL is all it needs.

## `denox new <name>`

```bash
denox new my-shop --url=https://my-shop.deno.net
```

Shallow-clones the template, removes its git history and starts a fresh one, resets `VERSION` to
`0.1.0` and the changelog, and personalizes `denox.config.ts` and the README with your project name.
`--template=` points at a different repository (you trust what you point at).

The generated project passes `deno task ci` untouched.

## `denox generate feature <name>` (alias `g`)

```bash
denox g feature reviews
```

Writes a complete API slice — model, DTO, repository (interface + in-memory + Deno KV), service,
controller, routes with a **colocated OpenAPI description**, plus an integration test skeleton — and
wires it into `src/api/main.ts` at the `// denox:features` anchor.

Because the description ships with the slice, the parity test passes immediately; run
`deno task insomnia` to add the endpoints to the collection.

If you removed the anchor, the files are still generated and the two wiring lines are printed for
you to paste — the CLI never guesses at edited code. Existing features and invalid names abort with
an error; nothing is ever overwritten.

## `denox generate page <route>`

```bash
denox g page docs/faq
denox g page items/[id]
```

Creates the page file and regenerates the route table.

## Inside the repo

```bash
deno task cli g feature reviews
```
