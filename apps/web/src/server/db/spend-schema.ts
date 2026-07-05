import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { agents } from "./app-schema";
import { user } from "./auth-schema";

const now = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

/** Stripe customer handle per owner (vault scoping). */
export const stripeCustomers = sqliteTable("stripe_customers", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  customerId: text("customer_id").notNull(),
});

/**
 * Vaulted payment methods. Processor token + display metadata ONLY —
 * raw PAN/CVV never touches our servers, logs, or DB (hard rule).
 */
export const paymentMethods = sqliteTable(
  "payment_methods",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    processorToken: text("processor_token").notNull(),
    brand: text("brand").notNull(),
    last4: text("last4").notNull(),
    expMonth: integer("exp_month").notNull(),
    expYear: integer("exp_year").notNull(),
    isDefault: integer("is_default", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(now)
      .notNull(),
  },
  (t) => [index("payment_methods_userId_idx").on(t.userId)],
);

/**
 * Policies — versioned, immutable, replace-whole (PUT). One row per version;
 * absence of rows = version 0 (default deny-all). `doc` is a PolicyCreate
 * JSON exactly as in the /v1 spec.
 */
export const policies = sqliteTable(
  "policies",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    doc: text("doc", { mode: "json" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(now)
      .notNull(),
  },
  (t) => [index("policies_agent_version_idx").on(t.agentId, t.version)],
);

/** Payments in the /v1 Payment shape (amounts are decimal strings). */
export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    /** Attribution is never optional. */
    credentialId: text("credential_id").notNull(),
    counterpartyLabel: text("counterparty_label").notNull(),
    category: text("category").notNull(),
    amount: text("amount").notNull(),
    currency: text("currency").notNull(),
    status: text("status", {
      enum: [
        "pending_approval",
        "processing",
        "completed",
        "failed",
        "cancelled",
        "returned",
      ],
    }).notNull(),
    approvalId: text("approval_id"),
    failureReason: text("failure_reason"),
    purpose: text("purpose"),
    processorRef: text("processor_ref"),
    timeline: text("timeline", { mode: "json" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(now)
      .notNull(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("payments_userId_idx").on(t.userId),
    index("payments_agentId_idx").on(t.agentId),
  ],
);

/** Approvals — held actions awaiting the owner. Never errors. */
export const approvals = sqliteTable(
  "approvals",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    actionType: text("action_type", {
      enum: ["payment", "transfer", "counterparty"],
    }).notNull(),
    actionId: text("action_id").notNull(),
    trigger: text("trigger").notNull(),
    summary: text("summary", { mode: "json" }).notNull(),
    status: text("status", {
      enum: ["pending", "approved", "rejected", "expired"],
    }).notNull(),
    decidedBy: text("decided_by"),
    decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
    note: text("note"),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(now)
      .notNull(),
  },
  (t) => [index("approvals_userId_status_idx").on(t.userId, t.status)],
);

/**
 * Activity events — append-only. Application code never updates or deletes
 * rows here; every event carries agent + credential attribution.
 */
export const activityEvents = sqliteTable(
  "activity_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    agentId: text("agent_id"),
    credentialId: text("credential_id"),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    data: text("data", { mode: "json" }),
    occurredAt: integer("occurred_at", { mode: "timestamp_ms" })
      .default(now)
      .notNull(),
  },
  (t) => [
    index("activity_userId_idx").on(t.userId),
    index("activity_agentId_idx").on(t.agentId),
  ],
);
