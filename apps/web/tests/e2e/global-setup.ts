import { execSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

/** Fresh e2e database per run, migrated via drizzle-kit push. */
export default function globalSetup() {
  const appDir = path.resolve(__dirname, "../..");
  rmSync(path.join(appDir, ".e2e"), { recursive: true, force: true });
  mkdirSync(path.join(appDir, ".e2e"), { recursive: true });
  execSync("pnpm db:push", {
    cwd: appDir,
    stdio: "inherit",
    env: { ...process.env, DATABASE_PATH: "./.e2e/e2e.db" },
  });
}
