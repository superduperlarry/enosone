import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import * as schema from "./schema";

// Phase A local store. Postgres-portable: swap driver + dialect only.
const dbPath =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "enos.db");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
