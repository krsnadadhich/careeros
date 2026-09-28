import { redirect } from "next/navigation";
import { auth } from "./auth";

/**
 * The only sanctioned way feature `queries.ts` files obtain a userId —
 * always the authenticated session's user, never client-supplied input.
 * Redirects to sign-in if there is no session (defense in depth alongside
 * middleware route protection).
 */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }
  return session.user;
}

export async function getOptionalUser() {
  const session = await auth();
  return session?.user ?? null;
}
