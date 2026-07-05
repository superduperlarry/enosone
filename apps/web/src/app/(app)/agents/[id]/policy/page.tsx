import type { PolicyCreate } from "@enos/agentos-client";
import { notFound } from "next/navigation";
import { PolicyForm } from "@/components/policy-form";
import { getAgent } from "@/server/actions/agents";
import { getAgentOs } from "@/server/agentos";
import { requireSession } from "@/server/session";

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const agent = await getAgent(id);
  if (!agent) notFound();

  const policy = await getAgentOs(session.user.id).getPolicy(agent.id);
  const version = policy?.version ?? 0;
  const doc: PolicyCreate | null = policy
    ? {
        limits: policy.limits,
        counterparty_allowlist: policy.counterparty_allowlist,
        verified_counterparties_only: policy.verified_counterparties_only,
        merchant_category_allowlist: policy.merchant_category_allowlist,
        currency_allowlist: policy.currency_allowlist,
        approvals: policy.approvals,
      }
    : null;

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="font-display text-3xl text-evergreen">
          {agent.avatar} {agent.displayName} — Policy
        </h1>
        <span className="rounded-full bg-evergreen-50 px-3 py-1 font-ui text-xs text-evergreen-700">
          version {version}
        </span>
      </div>
      <p className="mt-1 font-body text-sm text-gray-500">
        The box this agent operates in: limits, allowlists, and what needs
        your approval. The agent can see its policy; only you can change it.
      </p>
      <div className="mt-8">
        <PolicyForm agentId={agent.id} version={version} initial={doc} />
      </div>
    </div>
  );
}
