/**
 * Unit tests — CLI pure functions (names, parsing, templates, wiring).
 */

import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { deriveNames, featureFiles, insertWiring, pageFile, parseCli } from "../../cli/main.ts";

Deno.test("deriveNames derives spellings and rejects bad input", () => {
  assertEquals(deriveNames("blog-posts"), {
    kebab: "blog-posts",
    pascal: "BlogPosts",
    camel: "blogPosts",
  });
  assertThrows(() => deriveNames("Reviews"), Error); // not kebab
  assertThrows(() => deriveNames("../escape"), Error); // traversal
  assertThrows(() => deriveNames("shared"), Error); // reserved
});

Deno.test("parseCli splits positionals from --flag=value", () => {
  const cli = parseCli(["new", "my-shop", "--url=https://x.dev", "--force"]);
  assertEquals(cli.command, "new");
  assertEquals(cli.args, ["my-shop"]);
  assertEquals(cli.flags.url, "https://x.dev");
  assertEquals(cli.flags.force, "true");
});

Deno.test("featureFiles renders the whole slice with no leftover placeholders", () => {
  const files = featureFiles(deriveNames("reviews"));
  const paths = Object.keys(files).sort();
  assertEquals(paths, [
    "src/api/reviews/reviews.controller.ts",
    "src/api/reviews/reviews.dto.ts",
    "src/api/reviews/reviews.model.ts",
    "src/api/reviews/reviews.repository.kv.ts",
    "src/api/reviews/reviews.repository.ts",
    "src/api/reviews/reviews.routes.ts",
    "src/api/reviews/reviews.service.ts",
    "test/integration/reviews_test.ts",
  ]);
  // No unresolved template placeholders (generated code may legitimately
  // contain runtime template literals like \`...\${record.id}\`).
  const all = Object.values(files).join("\n");
  assertEquals(/\$\{(kebab|pascal|camel|k|P|c)\}/.test(all), false);
  assertEquals(all.includes("undefined"), false);
  // The generated slice describes itself (0.8 parity test passes).
  assertStringIncludes(files["src/api/reviews/reviews.routes.ts"] ?? "", "registerOpenApiPaths");
});

Deno.test("insertWiring adds import + registration at the anchor, null without it", () => {
  const source = [
    'import { registerHealthRoutes } from "@/api/health/health.routes.ts";',
    "",
    "const api = new Hono();",
    "registerHealthRoutes(api);",
    "// denox:features",
    "",
    "export default api;",
  ].join("\n");
  const wired = insertWiring(source, deriveNames("reviews"));
  assertStringIncludes(wired ?? "", 'import { registerReviewsRoutes } from "@/api/reviews');
  assertStringIncludes(wired ?? "", "registerReviewsRoutes(api);\n// denox:features");
  assertEquals(insertWiring("no anchor here", deriveNames("reviews")), null);
});

Deno.test("pageFile builds nested and dynamic routes, rejects traversal", () => {
  const faq = pageFile("docs/faq");
  assertEquals(faq.path, "src/frontend/pages/docs/faq.ts");
  assertStringIncludes(faq.content, "<h1>Faq</h1>");
  assertEquals(pageFile("items/[id]").path, "src/frontend/pages/items/[id].ts");
  assertThrows(() => pageFile("../../etc/passwd"), Error);
});
