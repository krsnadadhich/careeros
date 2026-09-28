import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";

/**
 * DEV ONLY — signs in as the seeded dev user without real Google OAuth, so
 * the app is explorable before GOOGLE_CLIENT_ID/SECRET are configured.
 * Hard-disabled outside development; only ever authenticates the local
 * seed user (dev@careeros.local), never arbitrary input.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const user = await prisma.user.upsert({
    where: { email: "dev@careeros.local" },
    update: {},
    create: { email: "dev@careeros.local", name: "Dev User" },
  });

  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await prisma.session.create({ data: { sessionToken, userId: user.id, expires } });

  const res = NextResponse.redirect(new URL("/overview", process.env.NEXTAUTH_URL));
  res.cookies.set("authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    expires,
    path: "/",
  });
  return res;
}
