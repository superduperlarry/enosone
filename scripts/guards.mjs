#!/usr/bin/env node
/**
 * Hard-rule guards — run in CI and before every milestone commit.
 * Each guard greps source (comments stripped) and fails the build on a hit.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function* walk(dir, exts = [".ts", ".tsx"]) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (["node_modules", ".next", "generated"].includes(entry)) continue;
      yield* walk(full, exts);
    } else if (exts.some((e) => entry.endsWith(e))) {
      yield full;
    }
  }
}

/** Source lines with comment lines removed (keeps line numbers). */
function codeLines(file) {
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line, i) => ({ line, n: i + 1 }))
    .filter(({ line }) => {
      const t = line.trim();
      return !(
        t.startsWith("//") ||
        t.startsWith("*") ||
        t.startsWith("/*") ||
        t.startsWith("*/")
      );
    });
}

const failures = [];

function guard({ name, dirs, pattern, exclude = () => false }) {
  for (const dir of dirs) {
    for (const file of walk(path.join(root, dir))) {
      const rel = path.relative(root, file).replaceAll("\\", "/");
      if (exclude(rel)) continue;
      for (const { line, n } of codeLines(file)) {
        if (pattern.test(line)) {
          failures.push(`[${name}] ${rel}:${n}  ${line.trim()}`);
        }
      }
    }
  }
}

// 1. No tokens in browser storage — sessions are HttpOnly cookies only.
guard({
  name: "no-browser-storage",
  dirs: ["apps/web/src", "packages"],
  pattern: /\b(localStorage|sessionStorage)\b/,
});

// 2. Provider conditionals live in the adapter registry only.
guard({
  name: "provider-registry-only",
  dirs: ["apps/web/src", "packages"],
  pattern: /\bprovider\s*[!=]==?\s*["'`]/,
  exclude: (rel) => rel.startsWith("apps/web/src/server/providers/"),
});

// 3. No float money math. lib/money.ts is the single audited boundary.
guard({
  name: "decimal-money-only",
  dirs: [
    "apps/web/src/server/agentos",
    "apps/web/src/server/spend",
    "packages/agentos-client/src",
  ],
  pattern: /\bparseFloat\s*\(|\bNumber\s*\(|\bparseInt\s*\([^,)]*amount/,
  exclude: (rel) => rel.endsWith(".test.ts"),
});

// 4. Raw card data never appears server-side — vault tokens only.
guard({
  name: "no-raw-card-data",
  dirs: ["apps/web/src/server"],
  pattern: /\b(cvv|cvc|card_number|full_pan)\b/i,
});

if (failures.length > 0) {
  console.error(`Guard violations (${failures.length}):\n`);
  for (const f of failures) console.error("  " + f);
  process.exit(1);
}
console.log("All guards pass.");
