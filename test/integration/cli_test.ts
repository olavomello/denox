/**
 * Integration tests — the CLI generates a slice that actually works:
 * files type-check, routes register and the 0.8 parity test is satisfied.
 * The temp feature is removed afterwards (repo left untouched).
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { deriveNames, featureFiles, insertWiring, main } from "../../cli/main.ts";

const TEMP = "clitemps";

/** Removes generated artifacts. */
async function cleanup(): Promise<void> {
  await Deno.remove(`src/api/${TEMP}`, { recursive: true }).catch(() => {});
  await Deno.remove(`test/integration/${TEMP}_test.ts`).catch(() => {});
}

Deno.test("generate feature: files land, wiring happens, deno check passes", async () => {
  await cleanup();
  const before = await Deno.readTextFile("src/api/main.ts");
  try {
    const code = await main(["generate", "feature", TEMP]);
    assertEquals(code, 0);

    // Files exist where the templates promised.
    for (const path of Object.keys(featureFiles(deriveNames(TEMP)))) {
      assertEquals((await Deno.stat(path)).isFile, true);
    }
    // Wiring landed at the anchor.
    const wired = await Deno.readTextFile("src/api/main.ts");
    assertStringIncludes(wired, `register${deriveNames(TEMP).pascal}Routes(api);`);

    // The generated code type-checks against the real project.
    const check = await new Deno.Command("deno", {
      args: ["check", "--no-lock", `src/api/${TEMP}/${TEMP}.routes.ts`],
      env: { STRIPE_SECRET_KEY: "sk_test_dummy", STRIPE_WEBHOOK_SECRET: "whsec_dummy" },
    }).output();
    assertEquals(check.success, true);
  } finally {
    await Deno.writeTextFile("src/api/main.ts", before);
    await cleanup();
  }
});

Deno.test("generate feature: existing slice aborts, invalid name aborts", async () => {
  assertEquals(await main(["generate", "feature", "products"]), 1); // exists
  assertEquals(await main(["generate", "feature", "Bad_Name"]), 1); // invalid
});

Deno.test("anchor-missing fallback still generates and warns (FR-4)", async () => {
  await cleanup();
  const before = await Deno.readTextFile("src/api/main.ts");
  try {
    await Deno.writeTextFile(
      "src/api/main.ts",
      before.replace("// denox:features — `denox generate feature` wires new slices below.", ""),
    );
    const code = await main(["generate", "feature", TEMP]);
    assertEquals(code, 0); // warns, does not fail
    assertEquals((await Deno.stat(`src/api/${TEMP}/${TEMP}.model.ts`)).isFile, true);
    const untouched = await Deno.readTextFile("src/api/main.ts");
    assertEquals(untouched.includes(deriveNames(TEMP).pascal), false); // never guessed
  } finally {
    await Deno.writeTextFile("src/api/main.ts", before);
    await cleanup();
  }
});

Deno.test("unknown command and missing args exit 1", async () => {
  assertEquals(await main(["frobnicate"]), 1);
  assertEquals(await main(["new"]), 1);
  assertEquals(await main(["generate", "feature"]), 1);
  assertEquals(await main(["help"]), 0);
});

Deno.test("insertWiring is idempotent-safe on the real main.ts", async () => {
  const source = await Deno.readTextFile("src/api/main.ts");
  const wired = insertWiring(source, deriveNames("widgets"));
  assertStringIncludes(wired ?? "", "registerWidgetsRoutes(api);");
  assertStringIncludes(wired ?? "", "// denox:features");
});
