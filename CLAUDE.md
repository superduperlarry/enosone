# ENOS One — Consumer Webapp (Phase A)

ENOS One aggregates AI agents (bring any model, run agents in one workspace) but
originates from payments: **every agent gets working money under owner-defined
control.** This repo is the **consumer surface** — a *client* of the Agent OS
`/v1` backend (repo `osenstack`). It must never grow its own payments backend.

## The contract

- [docs/agent_os_openapi.yaml](docs/agent_os_openapi.yaml) — the Agent OS `/v1`
  API. **The backend of record for all money operations.** ENOS One never
  reimplements ledger, policy, or payment logic — it consumes it.
  Sandbox: `https://sandbox.api.enosone.com/v1`.
- [docs/AGENT_OS_MCP_TOOL_CATALOG.md](docs/AGENT_OS_MCP_TOOL_CATALOG.md) — the
  agent-scoped MCP surface (context; the webapp talks REST).
- [docs/HANDOFF_Enstack_Agent_OS_Session.md](docs/HANDOFF_Enstack_Agent_OS_Session.md) —
  session context and open decision gates.

## Hard rules (violations are rejected changes)

1. **No tokens in localStorage/sessionStorage, ever.** Sessions live in
   HttpOnly cookies. CI greps for it.
2. **Raw PAN/CVV never touches our servers, logs, or DB.** Card vaulting goes
   through the processor's client SDK (Stripe-class tokenization); we store
   token + last4 + brand only.
3. **Model keys are encrypted at rest** (KMS-style envelope via the `Keyring`
   interface) and **never sent to the browser after save**.
4. **Provider adapter registry.** A hardcoded `if (provider === "deepseek")`
   outside `apps/web/src/server/providers/` is a rejected change; CI greps.
5. **Decimal-string money only.** All money math goes through
   `apps/web/src/lib/money.ts` (big.js). A float in money math fails CI.
6. **Approvals are held objects, never errors.** Over-limit spends return
   `pending_approval` status + an Approval — mirroring the Agent OS 202
   semantics exactly.
7. **Policy UI is shaped exactly like the `/v1` Policy schema** so Phase B can
   swap the local store for the real policy endpoints without UI changes.
8. **All money ops go through the `AgentOsService` seam**
   (`packages/agentos-client`): `mock` impl (Phase A default) or `agentos`
   (real sandbox), switched by `ENOS_BACKEND` env var.
9. **Customer-safe vocabulary** in anything user-visible: "Balance",
   "Enstack Routing", rail names. Never "stablecoin/USDC/onchain/OSN".

## Phase ladder

- **A — Workspace + card-on-file** (this build; no KYC)
- **B — Balance**: embedded **non-custodial** wallet, EVM + Solana + TRON
- **C — Agent cards**: per-agent Visa/Mastercard, KYC once (blocked on issuer gate)
- **D — Verified identity**: ZK-proof layer over the KYC record
- **E — Virtual bank account**: identity-gated, via regulated banking partners
  (do not name the bank in consumer materials)

Out of scope for Phase A: chain integration, card issuance, KYC, ZK identity,
bank accounts, mobile wrappers. Roadmap features appear as locked tiles with
waitlist CTAs only.

## Brand

Evergreen `#183A2D` primary · lime `#D8FF32` accent · teal `#30B8B2` ·
lavender `#D7D2E7`. Playfair Display headlines · Space Grotesk UI/labels ·
Noto Sans body. Tokens live in `packages/ui`.

## Dev commands

```
pnpm install                 # install workspace deps
pnpm dev                     # apps/web dev server (http://localhost:3000)
pnpm db:push                 # apply Drizzle schema to local SQLite
pnpm test                    # Vitest unit tests (policy engine etc.)
pnpm test:e2e                # Playwright smoke
pnpm codegen                 # regenerate /v1 types from docs/agent_os_openapi.yaml
pnpm guards                  # run the CI guard greps locally
```

## Layout

`apps/web` — Next.js (App Router, TS). `packages/ui` — brand tokens + shared
components. `packages/agentos-client` — generated `/v1` types +
`AgentOsService` (mock | agentos).
