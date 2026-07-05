import { walk } from "@std/fs/walk";

const ROOT = "src/frontend/pages";
const OUTPUT = "src/frontend/pages.gen.ts";

const imports: string[] = [];
const pages: string[] = [];

let index = 0;

for await (const entry of walk(ROOT, {
  includeDirs: false,
  exts: [".ts"],
})) {
  const variable = `page${index++}`;

  const relative = entry.path
    .replace(/^src[\\/]+frontend[\\/]+pages[\\/]?/, "")
    .replace(/\\/g, "/");

  const importPath = "./pages/" + relative;

  let route = relative.replace(/\.ts$/, "");

  // index.ts -> /
  if (route === "index") {
    route = "";
  }

  // products/main.ts -> /products
  route = route.replace(/\/main$/, "");

  // users/index.ts -> /users
  route = route.replace(/\/index$/, "");

  // [id] -> :id
  route = route.replace(/\[(.+?)\]/g, ":$1");

  if (!route.startsWith("/")) {
    route = "/" + route;
  }

  imports.push(
    `import * as ${variable} from "${importPath}";`,
  );

  pages.push(`  {
    route: "${route}",
    module: ${variable}
  }`);
}

const file = `// AUTO GENERATED
// DO NOT EDIT

${imports.join("\n")}

export const pages = [
${pages.join(",\n")}
];
`;

await Deno.writeTextFile(OUTPUT, file);

console.log(`Generated ${pages.length} routes.`);