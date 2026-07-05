"use client";

import type { Approval, Money } from "@enos/agentos-client";
import { Button, Card, StatusBadge } from "@enos/ui";
import { useState, useTransition } from "react";
import { decideApproval } from "@/server/actions/spend";

export function ApprovalCard({ approval }: { approval: Approval }) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const summary = (approval.summary ?? {}) as {
    agent_name?: string;
    agent_avatar?: string;
    amount?: Money;
    counterparty?: string;
    category?: string;
    purpose?: string | null;
    detail?: string;
  };

  const decide = (decision: "approve" | "reject") =>
    startTransition(async () => {
      await decideApproval(approval.id, decision, note || undefined);
    });

  const isPending = approval.status === "pending";

  return (
    <Card className="max-w-2xl">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{summary.agent_avatar ?? "🤖"}</span>
          <div>
            <p className="font-ui text-sm text-gray-500">
              {summary.agent_name ?? approval.agent_id} wants to pay
            </p>
            <p className="font-display text-2xl text-evergreen">
              {summary.amount
                ? `${summary.amount.currency} ${summary.amount.amount}`
                : "—"}{" "}
              <span className="font-ui text-base text-gray-500">
                to {summary.counterparty}
              </span>
            </p>
          </div>
        </div>
        <StatusBadge status={approval.status} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 font-body text-sm">
        <div>
          <dt className="text-gray-400">Held by rule</dt>
          <dd className="font-ui text-evergreen-700">{approval.trigger}</dd>
        </div>
        <div>
          <dt className="text-gray-400">Category</dt>
          <dd>{summary.category?.replaceAll("_", " ") ?? "—"}</dd>
        </div>
        {summary.purpose ? (
          <div className="col-span-2">
            <dt className="text-gray-400">Purpose</dt>
            <dd>{summary.purpose}</dd>
          </div>
        ) : null}
        {summary.detail ? (
          <div className="col-span-2">
            <dt className="text-gray-400">Why it was held</dt>
            <dd>{summary.detail}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-gray-400">Expires</dt>
          <dd>{new Date(approval.expires_at).toLocaleString()}</dd>
        </div>
        {approval.note ? (
          <div>
            <dt className="text-gray-400">Note</dt>
            <dd>{approval.note}</dd>
          </div>
        ) : null}
      </dl>

      {isPending ? (
        <div className="mt-5 flex items-center gap-3 border-t border-evergreen-100 pt-4">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="Optional note"
            className="flex-1 rounded-lg border border-evergreen-100 px-3 py-2 font-body text-sm outline-none focus:border-teal"
          />
          <Button
            size="sm"
            disabled={pending}
            onClick={() => decide("approve")}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={pending}
            onClick={() => decide("reject")}
          >
            Reject
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
