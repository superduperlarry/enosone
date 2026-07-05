import { Nav } from "@/components/nav";
import { requireSession } from "@/server/session";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();
  return (
    <div className="flex min-h-screen">
      <Nav userEmail={session.user.email} />
      <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
    </div>
  );
}
