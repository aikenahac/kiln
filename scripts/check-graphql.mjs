// Validates every GraphQL document in src/api/documents against the schema
// eas-cli ships (packages/eas-cli/graphql.schema.json on main). Expo's schema
// is internal, so run this after touching a document and before releases.
//
//   pnpm schema:check            uses the cached schema if present
//   pnpm schema:check --refresh  downloads the latest schema first
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildClientSchema, parse, validate } from "graphql";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cache = join(root, "node_modules", ".cache", "kiln", "eas-schema.json");
const SCHEMA_URL =
  "https://raw.githubusercontent.com/expo/eas-cli/main/packages/eas-cli/graphql.schema.json";

if (process.argv.includes("--refresh") || !existsSync(cache)) {
  const response = await fetch(SCHEMA_URL);
  if (!response.ok) throw new Error(`Schema download failed: HTTP ${response.status}`);
  mkdirSync(dirname(cache), { recursive: true });
  writeFileSync(cache, await response.text());
}

const json = JSON.parse(readFileSync(cache, "utf8"));
const schema = buildClientSchema(json.data ?? json);
const folder = join(root, "src", "api", "documents");
let documents = 0;
let failures = 0;
for (const file of readdirSync(folder).filter((name) => name.endsWith(".ts"))) {
  const module = await import(pathToFileURL(join(folder, file)).href);
  for (const [name, value] of Object.entries(module)) {
    if (typeof value !== "string" || !/^\s*(query|mutation)\b/m.test(value)) continue;
    documents += 1;
    let errors;
    try {
      errors = validate(schema, parse(value));
    } catch (error) {
      errors = [error];
    }
    for (const error of errors) {
      failures += 1;
      console.error(`${file} ${name}: ${error.message}`);
    }
  }
}
console.log(`${documents} documents checked, ${failures} errors`);
process.exit(failures ? 1 : 0);
