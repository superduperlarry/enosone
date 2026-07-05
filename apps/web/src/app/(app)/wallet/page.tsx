import { EmptyState } from "@enos/ui";

export default function WalletPage() {
  return (
    <div>
      <h1 className="font-display text-3xl text-evergreen">Wallet</h1>
      <p className="mt-1 font-body text-sm text-gray-500">
        The card on file your agents spend from — vaulted with the processor,
        never stored here.
      </p>
      <div className="mt-8">
        <EmptyState
          title="No payment method yet"
          description="Add a card to give your agents a funded method to spend from. (Milestone 4)"
        />
      </div>
    </div>
  );
}
