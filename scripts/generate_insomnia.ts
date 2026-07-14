/**
 * Insomnia collection generator — `deno task insomnia`.
 *
 * Converts the OpenAPI document into docs/denox-insomnia.json: one folder
 * per tag, one request per operation, deterministic ids/sort keys so
 * diffs stay clean. The suite fails when the committed collection is
 * stale (see test/integration/openapi_test.ts), same pattern as the
 * generated routes check.
 */

import "@/app.ts"; // boots every slice so all registrations run
import { site } from "@/config/site.ts";
import { buildOpenApiDocument, type OperationObject, type SchemaObject } from "@/shared/openapi.ts";

/** Slugifies a tag/operation into a stable id fragment. */
const idify = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, "_");

/** Practical folder order (usage flow); unknown tags append after. */
const TAG_ORDER = ["Health", "Auth", "Products", "Payments", "Users", "Contact"];

/**
 * Maps a path parameter to a contextual environment variable so ids never
 * collide across folders: {id} under /products → product_id, and so on.
 */
function paramVariable(path: string, param: string): string {
  if (param === "imageId") return "image_id";
  if (param === "id") {
    if (path.includes("/products/")) return "product_id";
    if (path.includes("/payments/")) return "payment_id";
    if (path.includes("/users/")) return "user_id";
  }
  return param;
}

/** Builds the Insomnia v4 export from the OpenAPI document. */
export function buildInsomniaCollection(): SchemaObject {
  const doc = buildOpenApiDocument();
  const resources: SchemaObject[] = [
    {
      _id: "wrk_denox",
      _type: "workspace",
      parentId: null,
      modified: 0,
      created: 0,
      name: `${site.app.name} API`,
      description:
        "Generated from /openapi.json — edit slice descriptions, then `deno task insomnia`.",
      scope: "collection",
    },
    {
      _id: "env_base",
      _type: "environment",
      parentId: "wrk_denox",
      modified: 0,
      created: 0,
      name: "Base Environment",
      data: {
        base_url: "http://localhost:8000",
        product_id: "",
        payment_id: "",
        user_id: "",
        image_id: "",
      },
      dataPropertyOrder: null,
      color: "#ff3b30",
      isPrivate: false,
      metaSortKey: 0,
    },
    {
      _id: "env_local",
      _type: "environment",
      parentId: "env_base",
      modified: 0,
      created: 0,
      name: "Local",
      data: { base_url: "http://localhost:8000" },
      dataPropertyOrder: null,
      color: "#0a84ff",
      isPrivate: false,
      metaSortKey: 1,
    },
    {
      _id: "env_production",
      _type: "environment",
      parentId: "env_base",
      modified: 0,
      created: 0,
      name: "Production",
      data: { base_url: site.app.url.replace(/\/+$/, "") },
      dataPropertyOrder: null,
      color: "#34c759",
      isPrivate: false,
      metaSortKey: 2,
    },
  ];

  // Collect operations first so folders and requests can be ordered
  // practically (TAG_ORDER + x-denox-sort) regardless of path sorting.
  const operations: { path: string; method: string; op: OperationObject }[] = [];
  for (const path of Object.keys(doc.paths as SchemaObject)) {
    const item = (doc.paths as SchemaObject)[path] as Record<string, OperationObject>;
    for (const [method, op] of Object.entries(item)) operations.push({ path, method, op });
  }
  const tagRank = (tag: string): number => {
    const index = TAG_ORDER.indexOf(tag);
    return index === -1 ? TAG_ORDER.length + tag.charCodeAt(0) : index;
  };
  operations.sort((a, b) => {
    const tagDiff = tagRank(a.op.tags[0] ?? "Other") - tagRank(b.op.tags[0] ?? "Other");
    if (tagDiff !== 0) return tagDiff;
    return (a.op["x-denox-sort"] ?? 99) - (b.op["x-denox-sort"] ?? 99);
  });

  const tags = new Map<string, number>();
  let requestSort = 0;
  for (const { path, method, op } of operations) {
    {
      const tag = op.tags[0] ?? "Other";
      if (!tags.has(tag)) {
        tags.set(tag, tags.size);
        resources.push({
          _id: `fld_${idify(tag)}`,
          _type: "request_group",
          parentId: "wrk_denox",
          modified: 0,
          created: 0,
          name: tag,
          description: "",
          environment: {},
          environmentPropertyOrder: null,
          metaSortKey: tags.size,
        });
      }
      const admin = op["x-denox-role"] === "admin";
      const url = "{{ _.base_url }}" +
        path.replace(/\{(\w+)\}/g, (_m, p: string) => `{{ _.${paramVariable(path, p)} }}`);

      const examples = op["x-denox-examples"] ?? [null];
      for (const example of examples) {
        const suffix = example === null || examples.length === 1 ? "" : ` (${example.name})`;
        const name = `${admin ? "[ADMIN] " : ""}${op.summary}${suffix}`;
        const request: SchemaObject = {
          _id: `req_${idify(op.operationId)}${
            example === null || examples.length === 1 ? "" : `_${idify(example.name)}`
          }`,
          _type: "request",
          parentId: `fld_${idify(tag)}`,
          modified: 0,
          created: 0,
          url,
          name,
          method: method.toUpperCase(),
          description: [
            op.description ?? "",
            admin ? "\n\nRequires an admin session (login first via Auth)." : "",
          ].join("").trim(),
          parameters: [],
          headers: [],
          authentication: {},
          metaSortKey: ++requestSort,
          isPrivate: false,
          settingStoreCookies: true,
          settingSendCookies: true,
          settingDisableRenderRequestBody: false,
          settingEncodeUrl: true,
          settingRebuildPath: true,
          settingFollowRedirects: "global",
          body: {},
        };

        if (example !== null && example.multipart !== undefined) {
          request.body = {
            mimeType: "multipart/form-data",
            params: example.multipart.map((field) => ({
              name: field.name,
              value: field.value ?? "",
              ...(field.file === true ? { type: "file", fileName: "" } : {}),
              ...(field.disabled === true ? { disabled: true } : {}),
            })),
          };
        } else {
          const jsonSchema = op.requestBody?.content?.["application/json"]?.schema as
            | SchemaObject
            | undefined;
          const body = example !== null && example.body !== undefined
            ? example.body
            : jsonSchema?.example;
          if (body !== undefined) {
            request.body = {
              mimeType: "application/json",
              text: JSON.stringify(body, null, 2),
            };
            request.headers = [{ name: "Content-Type", value: "application/json" }];
          }
        }
        resources.push(request);
      }
    }
  }

  return {
    _type: "export",
    __export_format: 4,
    __export_date: "2026-01-01T00:00:00.000Z",
    __export_source: "denox:openapi",
    resources,
  };
}

if (import.meta.main) {
  const json = JSON.stringify(buildInsomniaCollection(), null, 2) + "\n";
  await Deno.writeTextFile("docs/denox-insomnia.json", json);
  console.log(`Generated docs/denox-insomnia.json`);
}
