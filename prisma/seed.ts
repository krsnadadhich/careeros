// DEV ONLY — creates a single convenience user row so the DB isn't
// completely empty on first run. This is NOT sample product data (jobs,
// emails, applications, etc. are intentionally left empty per Rule 2 of
// the CareerOS product spec) — real data only ever arrives through real
// sign-in + real integrations.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "dev@careeros.local";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Dev user already exists: ${email}`);
    return;
  }

  const user = await prisma.user.create({
    data: { email, name: "Dev User" },
  });
  console.log(`Created dev user: ${user.email} (${user.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
