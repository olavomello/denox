/**
 * API documentation routes — /openapi.json and /docs/api-reference.
 *
 * The reference page is server-rendered from the document itself: zero
 * dependencies, no CDN scripts (CSP unchanged). Teams preferring Swagger
 * UI or Scalar can point them at /openapi.json.
 */

import type { Hono } from "hono";
import { site } from "@/config/site.ts";
import { escapeHtml } from "@/shared/html.ts";
import {
  buildOpenApiDocument,
  openApiJson,
  type OperationObject,
  type SchemaObject,
} from "@/shared/openapi.ts";

/** Renders one operation card. */
function operationHtml(method: string, path: string, op: OperationObject): string {
  const role = op["x-denox-role"];
  const auth = role === "admin"
    ? '<span class="badge badge-admin">admin</span>'
    : op.security !== undefined
    ? '<span class="badge badge-auth">session</span>'
    : "";
  const params = (op.parameters ?? [])
    .map((p) =>
      `<li><code>${escapeHtml(String(p.name))}</code> <em>(${escapeHtml(String(p.in))})</em> — ${
        escapeHtml(String(p.description ?? ""))
      }</li>`
    )
    .join("");
  const responses = Object.entries(op.responses)
    .map(([status, r]) =>
      `<li><code>${escapeHtml(status)}</code> ${
        escapeHtml(String((r as SchemaObject).description ?? ""))
      }</li>`
    )
    .join("");
  const body = op.requestBody === undefined
    ? ""
    : `<details><summary>Request body</summary><pre>${
      escapeHtml(JSON.stringify(op.requestBody, null, 2))
    }</pre></details>`;
  return `<article class="op">
    <h4><span class="method method-${method}">${method.toUpperCase()}</span> <code>${
    escapeHtml(path)
  }</code> ${auth}</h4>
    <p>${escapeHtml(op.summary)}${
    op.description !== undefined ? ` — ${escapeHtml(op.description)}` : ""
  }</p>
    ${params !== "" ? `<ul class="params">${params}</ul>` : ""}
    ${body}
    <ul class="responses">${responses}</ul>
  </article>`;
}

/** Renders the whole reference page. */
export function renderApiReference(): string {
  const doc = buildOpenApiDocument();
  const byTag = new Map<string, string[]>();
  for (const [path, item] of Object.entries(doc.paths as Record<string, SchemaObject>)) {
    for (const [method, op] of Object.entries(item as Record<string, OperationObject>)) {
      const tag = op.tags[0] ?? "Other";
      const list = byTag.get(tag) ?? [];
      list.push(operationHtml(method, path, op));
      byTag.set(tag, list);
    }
  }
  const sections = [...byTag.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag, ops]) => `<section><h2>${escapeHtml(tag)}</h2>${ops.join("\n")}</section>`)
    .join("\n");
  return `<!DOCTYPE html>
<html lang="${site.app.locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(site.app.name)} — API Reference</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0 auto; max-width: 880px; padding: 40px 20px 80px; color: #1c2430; background: #fafbfc; }
    h1 { margin-bottom: 4px; } .sub { color: #5b6b7d; margin-top: 0; }
    h2 { border-bottom: 2px solid #e3e8ee; padding-bottom: 6px; margin-top: 40px; }
    .op { background: #fff; border: 1px solid #e3e8ee; border-radius: 10px; padding: 14px 18px; margin: 14px 0; }
    .op h4 { margin: 0 0 6px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .method { font-size: 0.72rem; font-weight: 800; padding: 3px 8px; border-radius: 6px; color: #fff; text-transform: uppercase; }
    .method-get { background: #2f7dd1; } .method-post { background: #2f9e6e; }
    .method-patch { background: #c98a1b; } .method-delete { background: #c9463d; }
    .badge { font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
    .badge-admin { background: #fde8e8; color: #b42318; } .badge-auth { background: #e8f0fe; color: #1a56db; }
    .params li, .responses li { font-size: 0.9rem; }
    details pre { background: #0f172a; color: #d7e2f0; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 0.78rem; }
    a { color: #1a56db; }
  </style>
</head>
<body>
  <h1>${escapeHtml(site.app.name)} API</h1>
  <p class="sub">${
    escapeHtml(site.app.description)
  } — machine-readable contract at <a href="/openapi.json">/openapi.json</a>.</p>
  ${sections}
</body>
</html>`;
}

/**
 * Registers the documentation endpoints.
 *
 * @param app Frontend router.
 * @param enabled Toggle (defaults to config; injectable for tests).
 */
export function registerOpenApiRoutes(app: Hono, enabled: boolean = site.api.docs): void {
  if (!enabled) return;
  app.get(
    "/openapi.json",
    (c) => c.body(openApiJson(), 200, { "content-type": "application/json; charset=utf-8" }),
  );
  app.get("/docs/api-reference", (c) => c.html(renderApiReference()));
}
