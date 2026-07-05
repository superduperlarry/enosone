"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@enos/ui";

const workspace = [
  { href: "/agents", label: "Agents" },
  { href: "/approvals", label: "Approvals" },
  { href: "/activity", label: "Activity" },
  { href: "/wallet", label: "Wallet" },
  { href: "/settings", label: "Settings" },
];

// Roadmap gates: navigation exists, features don't (Phase B–E).
const roadmap = [
  { href: "/balance", label: "Balance" },
  { href: "/cards", label: "Agent Cards" },
  { href: "/identity", label: "Verified Identity" },
  { href: "/bank", label: "Bank Account" },
];

function NavLink({
  href,
  label,
  locked,
}: {
  href: string;
  label: string;
  locked?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cx(
        "flex items-center justify-between rounded-lg px-3 py-2 font-ui text-sm transition-colors",
        active
          ? "bg-evergreen-700 text-lime"
          : "text-evergreen-100 hover:bg-evergreen-900 hover:text-white",
      )}
    >
      <span>{label}</span>
      {locked ? (
        <span aria-label="Coming soon" className="text-xs opacity-60">
          🔒
        </span>
      ) : null}
    </Link>
  );
}

export function Nav({ userEmail }: { userEmail?: string }) {
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-evergreen px-4 py-6">
      <Link
        href="/"
        className="mb-8 px-3 font-display text-2xl lowercase tracking-tight text-lime"
      >
        enos
      </Link>

      <div className="mb-2 px-3 font-ui text-[11px] uppercase tracking-widest text-evergreen-100/50">
        Workspace
      </div>
      <nav className="flex flex-col gap-1">
        {workspace.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      <div className="mb-2 mt-8 px-3 font-ui text-[11px] uppercase tracking-widest text-evergreen-100/50">
        Roadmap
      </div>
      <nav className="flex flex-col gap-1">
        {roadmap.map((item) => (
          <NavLink key={item.href} locked {...item} />
        ))}
      </nav>

      <div className="mt-auto px-3">
        {userEmail ? (
          <div
            className="mb-2 truncate font-ui text-xs text-evergreen-100/80"
            title={userEmail}
          >
            {userEmail}
          </div>
        ) : null}
        <div className="font-ui text-xs text-evergreen-100/50">
          Phase A · sandbox
        </div>
      </div>
    </aside>
  );
}
