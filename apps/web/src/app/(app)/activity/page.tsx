import type { Money } from "@enos/agentos-client";
import { EmptyState } from "@enos/ui";
import { getAgentOs } from "@/server/agentos";
import { listAgents } from "@/server/actions/agents";
import { requireSession } from "@/server/session";

const TYPE_ICONS: Record<string, string> = {
  "payment.completed": "✅",
  "payment.failed": "⚠️",
  "payment.cancelled": "🚫",
  "approval.requested": "✋",
  "approval.decided": "🗳️",
  "policy.updated": "📜",
  "policy.evaluation": "⚖️",
};

export default async function ActivityPage() {
  const session = await requireSession();
  const [events, agents] = await Promise.all([
    getAgentOs(session.user.id).listActivity({ limit: 100 }),
    listAgents(),
  ]);
  const agentName = new Map(agents.map((a) => [a.id, `${a.avatar} ${a.displayName}`]));

  return (
    <div>
      <h1 className="font-display text-3xl text-evergreen">Activity</h1>
      <p className="mt-1 font-body text-sm text-gray-500">
        Every event across all agents — attributed to the agent and credential
        that caused it, append-only.
      </p>

      <div className="mt-8 max-w-3xl">
        {events.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Payments, approvals, and policy evaluations will appear here with full attribution."
          />
        ) : (
          <ul className="divide-y divide-evergreen-100 rounded-card border border-evergreen-100 bg-white">
            {events.map((event) => {
              const data = (event.data ?? {}) as {
                amount?: Money;
                counterparty?: string;
                rule?: string;
                decision?: string;
                status?: string;
                version?: number;
                failure_reason?: string;
                reason?: string;
              };
              return (
                <li key={event.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="mt-0.5 text-lg">
                    {TYPE_ICONS[event.type] ?? "•"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-ui text-sm font-medium text-evergreen">
                        {event.type}
                      </span>
                      {data.amount ? (
                        <span className="font-body text-sm text-gray-600">
                          {data.amount.currency} {data.amount.amount}
                          {data.counterparty ? ` → ${data.counterparty}` : ""}
                        </span>
                      ) : null}
                      {data.decision ? (
                        <span className="font-body text-sm text-gray-600">
                          decision: {data.decision}
                          {data.rule && data.rule !== "within_policy"
                            ? ` (${data.rule})`
                            : ""}
                        </span>
                      ) : null}
                      {data.status ? (
                        <span className="font-body text-sm text-gray-600">
                          {data.status}
                        </span>
                      ) : null}
                      {data.version != null ? (
                        <span className="font-body text-sm text-gray-600">
                          v{data.version}
                        </span>
                      ) : null}
                      {data.failure_reason || data.reason ? (
                        <span className="font-body text-sm text-danger">
                          {data.failure_reason ?? data.reason}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate font-ui text-xs text-gray-400">
                      {event.agent_id
                        ? (agentName.get(event.agent_id) ?? event.agent_id)
                        : "account"}
                      {event.credential_id ? ` · ${event.credential_id}` : ""}
                      {" · "}
                      {new Date(event.occurred_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
