import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import openapiTS, { astToString } from "openapi-typescript";
const output = spawnSync(
  "uv",
  [
    "run",
    "--project",
    ".",
    "--directory",
    "apps/api",
    "python",
    "-c",
    "import json; from lokifi.main import app; print(json.dumps(app.openapi()))",
  ],
  {
    encoding: "utf8",
    env: {
      ...process.env,
      LOKIFI_DATABASE_URL: process.env.LOKIFI_DATABASE_URL || "postgresql+psycopg://unused@127.0.0.1/unused",
    },
  },
);
if (output.status !== 0) {
  console.error(output.stderr);
  process.exit(1);
}
const schema = JSON.parse(output.stdout);
const types = astToString(await openapiTS(schema));
const target = "apps/web/src/api-schema.d.ts";
if (process.argv.includes("--check")) {
  if (readFileSync(target, "utf8") !== types) {
    console.error("API types differ from the backend contract");
    process.exit(1);
  }
} else {
  mkdirSync("apps/web/src", { recursive: true });
  writeFileSync(target, types);
}
console.log("API contract " + (process.argv.includes("--check") ? "verified" : "generated"));
