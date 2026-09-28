import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe subset of the Auth.js config (no Prisma adapter — adapters
 * aren't edge-runtime compatible). Used by middleware.ts for route
 * protection. The full config with the adapter lives in auth.ts.
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly",
        },
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const isAppRoute = !request.nextUrl.pathname.startsWith("/sign-in");
      if (isAppRoute && !isLoggedIn) return false;
      return true;
    },
  },
};
