# enosone

**ENOS One** — one workspace for AI agents with working money.

Bring any model, run agents in one place — and give every agent real spending
power under owner-defined control: per-agent limits, category allowlists, and
in-app approvals for anything above threshold. Every spend is attributed to
the agent that raised it and the rule that evaluated it.

The backend of record for all money operations is the **Enstack Agent OS
`/v1` API** ([docs/agent_os_openapi.yaml](docs/agent_os_openapi.yaml)). This
repo is the consumer surface; it consumes ledger, policy, and payment logic —
never reimplements it.

## Monorepo

| Path | What |
| :--- | :--- |
| `apps/web` | Next.js (App Router, TypeScript) webapp |
| `packages/ui` | Brand tokens (Tailwind) + shared components |
| `packages/agentos-client` | Typed `/v1` client (generated) + `AgentOsService` seam (`mock` \| `agentos`) |

## Quick start

```
pnpm install
pnpm db:push       # local SQLite schema
pnpm dev           # http://localhost:3000
```

See [CLAUDE.md](CLAUDE.md) for the hard rules and phase ladder.
