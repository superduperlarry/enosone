import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

const now = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

/**
 * Workspace agents. Status vocabulary mirrors the /v1 Agent schema
 * (active | suspended | deactivated) so Phase B can map 1:1.
 */
export const agents = sqliteTable(
  "agents",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    description: text("description"),
    avatar: text("avatar").notNull().default("🤖"),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    systemPrompt: text("system_prompt").notNull().default(""),
    status: text("status", {
      enum: ["active", "suspended", "deactivated"],
    })
      .notNull()
      .default("active"),
    policyVersion: integer("policy_version").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(now)
      .notNull(),
  },
  (t) => [index("agents_userId_idx").on(t.userId)],
);

/**
 * BYO model keys — one per (owner, provider). The secret is envelope-
 * encrypted via the Keyring; only `last4` is ever sent to the browser.
 */
export const modelKeys = sqliteTable(
  "model_keys",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    label: text("label"),
    last4: text("last4").notNull(),
    baseUrl: text("base_url"),
    secretEnvelope: text("secret_envelope").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(now)
      .notNull(),
  },
  (t) => [index("model_keys_user_provider_idx").on(t.userId, t.provider)],
);

/** A task run = one chat thread with an agent. */
export const runs = sqliteTable(
  "runs",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New run"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(now)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(now)
      .notNull(),
  },
  (t) => [index("runs_agentId_idx").on(t.agentId)],
);

/** Waitlist signups for roadmap-gated features (Phase B–E tiles). */
export const waitlist = sqliteTable(
  "waitlist",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    feature: text("feature", {
      enum: ["balance", "cards", "identity", "bank"],
    }).notNull(),
    email: text("email").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(now)
      .notNull(),
  },
  (t) => [index("waitlist_user_feature_idx").on(t.userId, t.feature)],
);

/** Persisted UI messages (AI SDK UIMessage parts as JSON). */
export const runMessages = sqliteTable(
  "run_messages",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
    parts: text("parts", { mode: "json" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(now)
      .notNull(),
  },
  (t) => [index("run_messages_runId_idx").on(t.runId)],
);
