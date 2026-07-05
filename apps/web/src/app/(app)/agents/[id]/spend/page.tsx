import Link from "next/link";
import { notFound } from "next/navigation";
import { SpendForm } from "@/components/spend-form";
import { getAgent } from "@/server/actions/agents";

export default async function SpendPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgent(id);
  if (!agent) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-evergreen">
        Pay for a service
      </h1>
      <p className="mt-1 font-body text-sm text-gray-500">
        Raise a spend intent as {agent.avatar} {agent.displayName}. It is
        evaluated against your policy — within limits it executes on the card
        on file; above them it waits for your approval.{" "}
        <Link
          href={`/agents/${agent.id}/policy`}
          className="text-teal underline"
        >
          View policy
        </Link>
      </p>
      <div className="mt-8">
        <SpendForm agentId={agent.id} />
      </div>
    </div>
  );
}
