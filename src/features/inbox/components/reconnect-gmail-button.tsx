"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

/** Re-runs the Google OAuth consent flow for the already-signed-in user —
 * needed because a Testing-mode (unverified) Google OAuth app's refresh
 * tokens expire after 7 days, and a plain "Sync Gmail" retry can't fix a
 * dead refresh token, only a fresh consent grant can. `auth.ts`'s
 * `events.signIn` hook force-writes the new tokens onto the existing
 * Account row (it already forces `prompt=consent` for exactly this
 * reason), so this needs no sign-out step first. */
export function ReconnectGmailButton() {
  return (
    <Button size="sm" variant="outline" onClick={() => signIn("google", { callbackUrl: "/settings" })}>
      Reconnect Gmail
    </Button>
  );
}
