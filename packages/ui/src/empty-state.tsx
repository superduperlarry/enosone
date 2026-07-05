import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-evergreen-100 bg-surface px-6 py-16 text-center">
      <h3 className="font-display text-xl text-evergreen">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm font-body text-sm text-gray-500">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
