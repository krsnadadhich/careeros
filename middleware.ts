import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  matcher: ["/((?!api/auth|api/dev|sign-in|_next/static|_next/image|favicon.ico).*)"],
};
