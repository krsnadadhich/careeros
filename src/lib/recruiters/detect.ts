import type { EmailCategory, Recruiter } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isPlaceholderText } from "@/lib/utils";

export interface RecruiterEmailSignal {
  senderName: string;
  senderEmail: string | null;
  category: EmailCategory;
  extractedRecruiterName: string | null;
  extractedRecruiterEmail: string | null;
  extractedCompany: string | null;
}

export interface RecruiterIdentity {
  name: string;
  email: string | null;
  company: string | null;
}

/** A couple of extra "no answer" phrasings specific to a recruiter-name
 * prompt, on top of the shared placeholder set. */
const RECRUITER_SPECIFIC_PLACEHOLDERS = new Set(["no recruiter name", "no recruiter"]);

function isPlaceholder(value: string | null): boolean {
  if (isPlaceholderText(value)) return true;
  return RECRUITER_SPECIFIC_PLACEHOLDERS.has((value ?? "").trim().toLowerCase());
}

function isPlausibleEmail(value: string | null): value is string {
  return value !== null && !isPlaceholder(value) && value.includes("@");
}

/** Categories where a recruiter's name plausibly appears in the email's
 * own content — a small model asked to extract structured fields will
 * often hallucinate a "recruiterName" even for an unrelated email (a
 * LinkedIn "X accepted your invitation" notification classified
 * REJECTION producing a fabricated recruiter named after the connection).
 * Restricting trust to categories where a recruiter mention is actually
 * plausible cuts a real class of these false positives, though it can't
 * fix classification itself being wrong. */
const RECRUITER_PLAUSIBLE_CATEGORIES: EmailCategory[] = ["RECRUITERS", "INTERVIEWS", "ASSESSMENTS", "OFFERS"];

/** Decides whether an email carries a real recruiter identity worth
 * recording. Prefers the LLM-extracted fields (more reliable — pulled
 * from the body, not just header formatting) when the category makes a
 * recruiter mention plausible and the values aren't placeholder noise;
 * falls back to the raw sender only when the email is already categorized
 * as RECRUITERS, so we don't file every hiring-manager or ATS-noreply
 * address as a "recruiter" contact. Returns null when there's nothing
 * usable — an email that matches nothing simply stays unlinked (same
 * philosophy as application linking). */
export function extractRecruiterIdentity(signal: RecruiterEmailSignal): RecruiterIdentity | null {
  const categoryPlausible = RECRUITER_PLAUSIBLE_CATEGORIES.includes(signal.category);
  const hasName = categoryPlausible && !isPlaceholder(signal.extractedRecruiterName);
  const hasEmail = categoryPlausible && isPlausibleEmail(signal.extractedRecruiterEmail);

  if (hasName || hasEmail) {
    return {
      name: hasName ? signal.extractedRecruiterName!.trim() : signal.senderName,
      email: hasEmail ? signal.extractedRecruiterEmail : signal.senderEmail,
      company: isPlaceholder(signal.extractedCompany) ? null : signal.extractedCompany,
    };
  }

  if (signal.category === "RECRUITERS" && (signal.senderName || signal.senderEmail)) {
    return {
      name: signal.senderName || signal.senderEmail!,
      email: signal.senderEmail,
      company: isPlaceholder(signal.extractedCompany) ? null : signal.extractedCompany,
    };
  }

  return null;
}

/** Finds an existing Recruiter for this identity or creates one. Dedupes
 * by email first (the stable identifier when present, case-insensitive),
 * falling back to an exact name match only when no email is known on
 * either side. Fills in a previously-unknown company/email from newer
 * data but never overwrites a value that's already set — a later email
 * with sloppier extraction must not clobber a better one from before. */
export async function findOrCreateRecruiter(userId: string, identity: RecruiterIdentity): Promise<Recruiter> {
  let existing: Recruiter | null = null;

  if (identity.email) {
    existing = await prisma.recruiter.findFirst({
      where: { userId, email: { equals: identity.email, mode: "insensitive" } },
    });
  }
  if (!existing && !identity.email) {
    existing = await prisma.recruiter.findFirst({
      where: { userId, email: null, name: identity.name },
    });
  }

  if (existing) {
    const patch: { email?: string; company?: string } = {};
    if (!existing.email && identity.email) patch.email = identity.email;
    if (!existing.company && identity.company) patch.company = identity.company;
    if (Object.keys(patch).length === 0) return existing;
    return prisma.recruiter.update({ where: { id: existing.id }, data: patch });
  }

  return prisma.recruiter.create({
    data: { userId, name: identity.name, email: identity.email, company: identity.company },
  });
}
