import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

/** Server-side session gate for protected routes and actions. */
export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  return session;
}
