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
      data: { base_url: "http://localhost:8000", payment_id: "", product_id: "", image_id: "" },
      dataPropertyOrder: null,
      color: null,
      isPrivate: false,
      metaSortKey: 0,
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
      color: null,
      isPrivate: false,
      metaSortKey: 1,
    },
  ];

  const tags = new Map<string, number>();
  let requestSort = 0;
  for (const path of Object.keys(doc.paths as SchemaObject)) {
    const item = (doc.paths as SchemaObject)[path] as Record<string, OperationObject>;
    for (const [method, op] of Object.entries(item)) {
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
      const name = `${admin ? "[ADMIN] " : ""}${op.summary}`;
      const url = "{{ _.base_url }}" +
        path.replace(/\{(\w+)\}/g, (_m, p: string) => `{{ _.${p} }}`);
      const request: SchemaObject = {
        _id: `req_${idify(op.operationId)}`,
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
      const jsonSchema = op.requestBody?.content?.["application/json"]?.schema as
        | SchemaObject
        | undefined;
      if (jsonSchema?.example !== undefined) {
        request.body = {
          mimeType: "application/json",
          text: JSON.stringify(jsonSchema.example, null, 2),
        };
        request.headers = [{ name: "Content-Type", value: "application/json" }];
      }
      resources.push(request);
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
