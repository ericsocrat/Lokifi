import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
if (!env.LOKIFI_TEST_DATABASE_URL && existsSync(".local/database.json")) {
  const c = JSON.parse(readFileSync(".local/database.json", "utf8"));
  env.LOKIFI_TEST_DATABASE_URL = `postgresql+psycopg://lokifi:${c.password}@127.0.0.1:${c.port}/lokifi_rebuild_test`;
}
function run(command, args) {
  const npm = command === "npm";
  const executable = npm ? process.execPath : command;
  const actualArgs = npm
    ? [process.env.npm_execpath || join(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js"), ...args]
    : args;
  const r = spawnSync(executable, actualArgs, { stdio: "inherit", env });
  if (r.status !== 0) {
    console.error("Verification stopped at " + command + " " + args.join(" "));
    process.exit(r.status || 1);
  }
}
run("uv", ["sync", "--project", "apps/api", "--frozen"]);
run("uv", ["run", "--directory", "apps/api", "ruff", "check", "."]);
run("uv", ["run", "--directory", "apps/api", "ruff", "format", "--check", "."]);
run("uv", ["run", "--directory", "apps/api", "python", "-m", "pytest"]);
run("node", ["tools/contracts.mjs", "--check"]);
run("npm", ["run", "lint"]);
run("npm", ["run", "typecheck"]);
run("npm", ["run", "build"]);
run("npm", ["audit", "--audit-level=high"]);
console.log(
  "Static checks, PostgreSQL integration, API contract, production build and dependency audit passed. Run test:e2e against the built servers and backup.py --restore-test to complete release verification.",
);
