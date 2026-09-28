import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomBytes } from "node:crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Creates a real database session for the seeded dev user and returns the
 * cookie Playwright should set. This exercises the same NextAuth database-
 * session path a real Google sign-in would produce, without automating a
 * real OAuth flow (disproportionate test infrastructure for Phase 1).
 */
export async function createDevSessionCookie() {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "dev@careeros.local" },
  });

  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60);

  await prisma.session.create({
    data: { sessionToken, userId: user.id, expires },
  });

  return {
    name: "authjs.session-token",
    value: sessionToken,
    domain: "localhost",
    path: "/",
    expires: Math.floor(expires.getTime() / 1000),
    httpOnly: true,
    secure: false,
    sameSite: "Lax" as const,
  };
}
