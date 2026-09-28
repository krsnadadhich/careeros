import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/prisma";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  callbacks: {
    ...authConfig.callbacks,
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async signIn({ account }) {
      // Auth.js's Prisma adapter only persists tokens via linkAccount on the
      // *first-ever* link for a provider+account — a user who signed in
      // before the Gmail scope was added (or who denied it once) won't get
      // their Account row updated by simply signing in again. Since
      // authorization.params forces prompt=consent, every sign-in carries a
      // fresh token set here; force-write it so "sign out, sign back in"
      // reliably grants/refreshes Gmail access. Never let this block login.
      if (account?.provider !== "google") return;
      try {
        await prisma.account.update({
          where: {
            provider_providerAccountId: {
              provider: "google",
              providerAccountId: account.providerAccountId,
            },
          },
          data: {
            access_token: account.access_token,
            refresh_token: account.refresh_token ?? undefined,
            expires_at: account.expires_at,
            scope: account.scope,
          },
        });
      } catch (err) {
        console.error("[auth] failed to sync Google account tokens", (err as Error).message);
      }
    },
  },
});
