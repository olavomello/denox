/**
 * `denox` — the DenoX command line.
 *
 * Self-contained by design: no `@/` imports, no std imports, templates
 * embedded as constants — so it runs straight from the raw GitHub URL:
 *
 *   deno install -grA -n denox \
 *     https://raw.githubusercontent.com/olavomello/denox/main/cli/main.ts
 *
 * Commands: `new <name>`, `generate feature <name>`, `generate page
 * <route>`, `help`, `version`. Generators never overwrite existing files
 * and write only inside the current project.
 */

const CLI_VERSION = "0.9.0";
const TEMPLATE_REPO = "https://github.com/olavomello/denox";
const ANCHOR = "// denox:features";

// ---------------------------------------------------------------------------
// Names & arguments
// ---------------------------------------------------------------------------

/** Derived spellings of a feature name. */
export interface Names {
  /** Folder / URL segment (kebab, as typed). */
  readonly kebab: string;
  /** Type prefix (PascalCase). */
  readonly pascal: string;
  /** Identifier prefix (camelCase). */
  readonly camel: string;
}

/**
 * Validates a feature name and derives its spellings.
 *
 * @param input Name as typed (kebab-case).
 * @returns Derived names.
 * @throws Error when the name is invalid or reserved.
 */
export function deriveNames(input: string): Names {
  if (!/^[a-z][a-z0-9-]*$/.test(input)) {
    throw new Error(`Invalid name "${input}": use kebab-case ([a-z][a-z0-9-]*)`);
  }
  if (input.includes("..") || input.includes("/")) {
    throw new Error(`Invalid name "${input}"`);
  }
  const reserved = ["api", "main", "shared", "config", "test", "new", "feature", "page"];
  if (reserved.includes(input)) {
    throw new Error(`"${input}" is a reserved name`);
  }
  const pascal = input.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
  const camel = pascal.charAt(0).toLowerCase() + pascal.slice(1);
  return { kebab: input, pascal, camel };
}

/** Parsed command line. */
export interface Cli {
  readonly command: string;
  readonly args: readonly string[];
  readonly flags: Readonly<Record<string, string>>;
}

/**
 * Parses argv (no dependencies): positionals + `--flag=value` pairs.
 *
 * @param argv Raw arguments.
 * @returns Structured command line.
 */
export function parseCli(argv: readonly string[]): Cli {
  const args: string[] = [];
  const flags: Record<string, string> = {};
  for (const arg of argv) {
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq === -1) flags[arg.slice(2)] = "true";
      else flags[arg.slice(2, eq)] = arg.slice(eq + 1);
    } else {
      args.push(arg);
    }
  }
  const [command = "help", ...rest] = args;
  return { command, args: rest, flags };
}

// ---------------------------------------------------------------------------
// Feature templates
// ---------------------------------------------------------------------------

/**
 * Renders every file of a feature slice.
 *
 * @param names Derived names.
 * @returns Relative path → file content.
 */
export function featureFiles(names: Names): Record<string, string> {
  const { kebab: k, pascal: P, camel: c } = names;
  return {
    [`src/api/${k}/${k}.model.ts`]: `/**
 * ${P} entity. Pure data shape (MVC: models represent entities only).
 */

/** A stored ${c}. */
export interface ${P} {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
}

/** Data required to create a {@link ${P}}. */
export interface New${P} {
  readonly name: string;
}
`,
    [`src/api/${k}/${k}.dto.ts`]: `/**
 * ${P} DTO validation.
 */

import type { New${P} } from "@/api/${k}/${k}.model.ts";
import { ValidationException } from "@/shared/exceptions/app_exception.ts";

/**
 * Validates a create payload.
 *
 * @param body Raw request body.
 * @returns Validated payload.
 * @throws ValidationException with per-field details.
 */
export function parseCreate${P}Dto(body: Record<string, unknown>): New${P} {
  const fields: Record<string, string> = {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 120) {
    fields.name = "name must be a string of 2-120 characters";
  }
  if (Object.keys(fields).length > 0) {
    throw new ValidationException("Invalid ${c} payload", { fields });
  }
  return { name };
}
`,
    [`src/api/${k}/${k}.repository.ts`]: `/**
 * ${P} repositories — interface + in-memory driver.
 */

import type { New${P}, ${P} } from "@/api/${k}/${k}.model.ts";

/** Persistence contract for ${c} records. */
export interface ${P}Repository {
  findAll(): Promise<${P}[]>;
  findById(id: string): Promise<${P} | null>;
  create(data: New${P}): Promise<${P}>;
}

/** Default in-memory driver (development). */
export class InMemory${P}Repository implements ${P}Repository {
  private readonly items = new Map<string, ${P}>();

  /** @returns Every record. */
  findAll(): Promise<${P}[]> {
    return Promise.resolve([...this.items.values()]);
  }

  /** @returns The record, or null. */
  findById(id: string): Promise<${P} | null> {
    return Promise.resolve(this.items.get(id) ?? null);
  }

  /** Creates a record. */
  create(data: New${P}): Promise<${P}> {
    const record: ${P} = {
      id: crypto.randomUUID(),
      name: data.name,
      createdAt: new Date().toISOString(),
    };
    this.items.set(record.id, record);
    return Promise.resolve(record);
  }
}
`,
    [`src/api/${k}/${k}.repository.kv.ts`]: `/**
 * ${P} repository — Deno KV driver.
 */

import type { New${P}, ${P} } from "@/api/${k}/${k}.model.ts";
import type { ${P}Repository } from "@/api/${k}/${k}.repository.ts";

/** Durable driver over Deno KV (STORAGE_DRIVER=kv). */
export class Kv${P}Repository implements ${P}Repository {
  constructor(private readonly kv: Deno.Kv) {}

  /** @returns Every record. */
  async findAll(): Promise<${P}[]> {
    const items: ${P}[] = [];
    for await (const entry of this.kv.list<${P}>({ prefix: ["${k}"] })) {
      items.push(entry.value);
    }
    return items;
  }

  /** @returns The record, or null. */
  async findById(id: string): Promise<${P} | null> {
    const entry = await this.kv.get<${P}>(["${k}", id]);
    return entry.value;
  }

  /** Creates a record. */
  async create(data: New${P}): Promise<${P}> {
    const record: ${P} = {
      id: crypto.randomUUID(),
      name: data.name,
      createdAt: new Date().toISOString(),
    };
    await this.kv.set(["${k}", record.id], record);
    return record;
  }
}
`,
    [`src/api/${k}/${k}.service.ts`]: `/**
 * ${P} business rules.
 */

import type { New${P}, ${P} } from "@/api/${k}/${k}.model.ts";
import type { ${P}Repository } from "@/api/${k}/${k}.repository.ts";
import { NotFoundException } from "@/shared/exceptions/app_exception.ts";

/** Application service for ${c} records. */
export class ${P}Service {
  constructor(private readonly repository: ${P}Repository) {}

  /** @returns Every record. */
  list(): Promise<${P}[]> {
    return this.repository.findAll();
  }

  /**
   * @returns The record.
   * @throws NotFoundException for unknown ids.
   */
  async getById(id: string): Promise<${P}> {
    const record = await this.repository.findById(id);
    if (record === null) {
      throw new NotFoundException("${P} not found");
    }
    return record;
  }

  /** Creates a record. */
  create(data: New${P}): Promise<${P}> {
    return this.repository.create(data);
  }
}
`,
    [`src/api/${k}/${k}.controller.ts`]: `/**
 * ${P} HTTP controller.
 */

import type { Context } from "hono";
import { parseCreate${P}Dto } from "@/api/${k}/${k}.dto.ts";
import type { ${P}Service } from "@/api/${k}/${k}.service.ts";
import { ok } from "@/shared/http.ts";

/** Maps HTTP requests to the service. */
export class ${P}Controller {
  constructor(private readonly service: ${P}Service) {}

  /** GET / — lists records. */
  index = async (c: Context): Promise<Response> => {
    return c.json(ok(await this.service.list()));
  };

  /** GET /:id — one record. */
  show = async (c: Context): Promise<Response> => {
    return c.json(ok(await this.service.getById(c.req.param("id") ?? "")));
  };

  /** POST / — creates a record. */
  store = async (c: Context): Promise<Response> => {
    const body = await c.req.json<Record<string, unknown>>();
    const record = await this.service.create(parseCreate${P}Dto(body));
    return c.json(ok(record), 201);
  };
}
`,
    [`src/api/${k}/${k}.routes.ts`]: `/**
 * ${P} routes — registration + colocated OpenAPI description.
 */

import type { Hono } from "hono";
import { Kv${P}Repository } from "@/api/${k}/${k}.repository.kv.ts";
import { InMemory${P}Repository } from "@/api/${k}/${k}.repository.ts";
import { ${P}Controller } from "@/api/${k}/${k}.controller.ts";
import { ${P}Service } from "@/api/${k}/${k}.service.ts";
import { env } from "@/config/env.ts";
import {
  errorResponse,
  jsonBody,
  okResponse,
  pathParam,
  registerOpenApiPaths,
  type SchemaObject,
} from "@/shared/openapi.ts";
import { requireKv } from "@/shared/storage.ts";

/** Shared service instance. */
export const ${c}Service = new ${P}Service(
  env.STORAGE_DRIVER === "kv" ? new Kv${P}Repository(requireKv()) : new InMemory${P}Repository(),
);

/**
 * Registers /${k} endpoints.
 *
 * @param app API router.
 */
export function register${P}Routes(app: Hono): void {
  const controller = new ${P}Controller(${c}Service);
  app.get("/${k}", controller.index);
  app.post("/${k}", controller.store);
  app.get("/${k}/:id", controller.show);
}

const ${c}Schema: SchemaObject = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
  },
  required: ["id", "name", "createdAt"],
};

registerOpenApiPaths({
  "/api/${k}": {
    get: {
      operationId: "list${P}",
      summary: "List ${k}",
      tags: ["${P}"],
      responses: { "200": okResponse("Every record", { type: "array", items: ${c}Schema }) },
    },
    post: {
      operationId: "create${P}",
      summary: "Create ${c}",
      tags: ["${P}"],
      requestBody: jsonBody({
        type: "object",
        properties: { name: { type: "string", minLength: 2, maxLength: 120 } },
        required: ["name"],
        example: { name: "First ${c}" },
      }),
      responses: {
        "201": okResponse("Created", ${c}Schema),
        "400": errorResponse("Validation error"),
      },
    },
  },
  "/api/${k}/{id}": {
    get: {
      operationId: "get${P}",
      summary: "Get ${c}",
      tags: ["${P}"],
      parameters: [pathParam("id", "${P} id", { type: "string", format: "uuid" })],
      responses: {
        "200": okResponse("The record", ${c}Schema),
        "404": errorResponse("Unknown ${c}"),
      },
    },
  },
});
`,
    [`test/integration/${k}_test.ts`]: `/**
 * Integration tests — ${k} feature slice.
 */

import { assertEquals } from "@std/assert";
import { app } from "@/app.ts";

Deno.test("${k}: create, list and get round trip", async () => {
  const created = await app.request("http://localhost/api/${k}", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "First ${c}" }),
  });
  assertEquals(created.status, 201);
  const record = (await created.json()).data;

  const list = await app.request("http://localhost/api/${k}");
  assertEquals(
    (await list.json()).data.some((item: { id: string }) => item.id === record.id),
    true,
  );

  const single = await app.request(\`http://localhost/api/${k}/\${record.id}\`);
  assertEquals((await single.json()).data.name, "First ${c}");
});
`,
  };
}

/**
 * Inserts the wiring lines into src/api/main.ts source.
 *
 * @param source Current main.ts content.
 * @param names Derived names.
 * @returns Updated source, or null when the anchor is missing.
 */
export function insertWiring(source: string, names: Names): string | null {
  if (!source.includes(ANCHOR)) return null;
  const importLine =
    `import { register${names.pascal}Routes } from "@/api/${names.kebab}/${names.kebab}.routes.ts";`;
  const lines = source.split("\n");
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.startsWith("import ")) lastImport = i;
  }
  lines.splice(lastImport + 1, 0, importLine);
  const updated = lines.join("\n");
  const anchorIndex = updated.indexOf(ANCHOR);
  const lineStart = updated.lastIndexOf("\n", anchorIndex) + 1;
  return updated.slice(0, lineStart) +
    `register${names.pascal}Routes(api);\n` +
    updated.slice(lineStart);
}

/** Wiring instructions for the anchor-missing fallback. */
export function wiringInstructions(names: Names): string {
  return [
    `Add these two lines to src/api/main.ts yourself:`,
    `  import { register${names.pascal}Routes } from "@/api/${names.kebab}/${names.kebab}.routes.ts";`,
    `  register${names.pascal}Routes(api);`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Page template
// ---------------------------------------------------------------------------

/**
 * Renders a page file for a route like `docs/faq` or `items/[id]`.
 *
 * @param route Route path (no leading slash).
 * @returns File path + content.
 */
export function pageFile(route: string): { path: string; content: string } {
  const clean = route.replace(/^\/+|\/+$/g, "");
  if (clean === "" || clean.includes("..") || /[^a-z0-9\-/\[\]]/.test(clean)) {
    throw new Error(`Invalid route "${route}": use segments like docs/faq or items/[id]`);
  }
  const title = (clean.split("/").pop() ?? "Page").replace(/[\[\]]/g, "").replace(/-/g, " ");
  const pretty = title.charAt(0).toUpperCase() + title.slice(1);
  const fn = deriveNames(
    clean.replace(/[\[\]]/g, "").split("/").pop()?.replace(/[^a-z0-9-]/g, "") || "page",
  ).camel;
  return {
    path: `src/frontend/pages/${clean}.ts`,
    content: `/**
 * ${pretty} page — \`/${clean}\`.
 */

import type { Context } from "hono";

/** Page configuration. */
export const config = {
  layout: "default",
  meta: {
    title: "${pretty}",
    description: "${pretty} page.",
  },
} as const;

/**
 * Renders the ${title} page body.
 *
 * @param _c Request context.
 * @returns Page HTML.
 */
export default function ${fn}Page(_c: Context): string {
  return \`
    <h1>${pretty}</h1>
    <p>Generated by denox — edit src/frontend/pages/${clean}.ts.</p>
  \`;
}
`,
  };
}

// ---------------------------------------------------------------------------
// Shell (I/O)
// ---------------------------------------------------------------------------

/** Writes files, refusing to overwrite; logs each path. */
async function writeFiles(files: Record<string, string>): Promise<void> {
  for (const [path, content] of Object.entries(files)) {
    try {
      await Deno.stat(path);
      throw new Error(`Refusing to overwrite existing file: ${path}`);
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
    const dir = path.split("/").slice(0, -1).join("/");
    if (dir !== "") await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(path, content);
    console.log(`  created ${path}`);
  }
}

/** `denox new <name>` implementation. */
async function commandNew(name: string, flags: Record<string, string>): Promise<number> {
  try {
    deriveNames(name); // validates
  } catch (error) {
    console.error((error as Error).message);
    return 1;
  }
  const template = flags.template ?? TEMPLATE_REPO;
  console.log(`Creating ${name} from ${template} ...`);
  const clone = await new Deno.Command("git", {
    args: ["clone", "--depth", "1", template, name],
  }).output();
  if (!clone.success) {
    console.error("git clone failed — is git installed and the template URL reachable?");
    return 1;
  }
  await Deno.remove(`${name}/.git`, { recursive: true });
  await new Deno.Command("git", { args: ["init"], cwd: name }).output();
  await Deno.writeTextFile(`${name}/VERSION`, "0.1.0\n");
  await Deno.writeTextFile(
    `${name}/CHANGELOG.md`,
    "# Changelog\n\n## [Unreleased]\n\n### Added\n\n- Project scaffolded with `denox new`.\n",
  );
  const configPath = `${name}/denox.config.ts`;
  let config = await Deno.readTextFile(configPath);
  const pretty = name.replace(/-/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
  config = config.replace(/name: ".*?"/, `name: "${pretty}"`);
  config = config.replace(/shortName: ".*?"/, `shortName: "${pretty}"`);
  if (flags.url !== undefined) {
    config = config.replace(/url: ".*?"/, `url: "${flags.url}"`);
  }
  await Deno.writeTextFile(configPath, config);
  const readme = `# ${pretty}\n\nBuilt with [DenoX](${TEMPLATE_REPO}).\n`;
  await Deno.writeTextFile(`${name}/README.md`, readme);
  console.log(`\nDone! Next steps:\n`);
  console.log(`  cd ${name}`);
  console.log(`  cp .env.example .env`);
  console.log(`  deno task dev`);
  console.log(`\nFirst signup becomes admin. Happy shipping!`);
  return 0;
}

/** `denox generate feature <name>` implementation. */
async function commandGenerateFeature(name: string): Promise<number> {
  let names: Names;
  try {
    names = deriveNames(name);
  } catch (error) {
    console.error((error as Error).message);
    return 1;
  }
  try {
    await Deno.stat(`src/api/${names.kebab}`);
    console.error(`Feature "${names.kebab}" already exists (src/api/${names.kebab})`);
    return 1;
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
  await writeFiles(featureFiles(names));
  const mainPath = "src/api/main.ts";
  const source = await Deno.readTextFile(mainPath);
  const updated = insertWiring(source, names);
  if (updated === null) {
    console.warn(`\nAnchor "${ANCHOR}" not found in ${mainPath}.`);
    console.warn(wiringInstructions(names));
  } else {
    await Deno.writeTextFile(mainPath, updated);
    console.log(`  wired ${mainPath}`);
  }
  console.log(`\nFeature ready: deno task test`);
  return 0;
}

/** `denox generate page <route>` implementation. */
async function commandGeneratePage(route: string): Promise<number> {
  let file: { path: string; content: string };
  try {
    file = pageFile(route);
  } catch (error) {
    console.error((error as Error).message);
    return 1;
  }
  await writeFiles({ [file.path]: file.content });
  const routes = await new Deno.Command("deno", { args: ["task", "routes"] }).output();
  console.log(new TextDecoder().decode(routes.stdout).trim());
  return routes.success ? 0 : 1;
}

/** Help text. */
export const HELP = `denox — the DenoX command line

USAGE
  denox new <name> [--url=<production-url>] [--template=<git-url>]
  denox generate feature <name>     (alias: g feature)
  denox generate page <route>       (alias: g page)
  denox version
  denox help

EXAMPLES
  denox new my-shop --url=https://my-shop.deno.net
  denox g feature reviews
  denox g page docs/faq
`;

/** Entry point. */
export async function main(argv: readonly string[]): Promise<number> {
  const cli = parseCli(argv);
  const command = cli.command === "g" ? "generate" : cli.command;
  switch (command) {
    case "new": {
      if (cli.args[0] === undefined) {
        console.error("Usage: denox new <name>");
        return 1;
      }
      return await commandNew(cli.args[0], { ...cli.flags });
    }
    case "generate": {
      const [target, name] = cli.args;
      if (target === "feature" && name !== undefined) return await commandGenerateFeature(name);
      if (target === "page" && name !== undefined) return await commandGeneratePage(name);
      console.error("Usage: denox generate feature|page <name>");
      return 1;
    }
    case "version": {
      let version = CLI_VERSION;
      try {
        version = (await Deno.readTextFile("VERSION")).trim();
      } catch {
        // outside a project — CLI's own version
      }
      console.log(`denox ${version}`);
      return 0;
    }
    case "help": {
      console.log(HELP);
      return 0;
    }
    default: {
      console.error(`Unknown command "${cli.command}"\n`);
      console.log(HELP);
      return 1;
    }
  }
}

if (import.meta.main) {
  Deno.exit(await main(Deno.args));
}
