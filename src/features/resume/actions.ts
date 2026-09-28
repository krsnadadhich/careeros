"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getAIProvider } from "@/lib/ai/get-ai-provider";
import type { ParsedResume } from "@/lib/ai/types";
import {
  MAX_RESUME_BYTES,
  isPdfBuffer,
  sanitizeDisplayName,
  saveResumeFile,
  extractResumeText,
} from "@/lib/resume";
import { parseCommaList } from "@/lib/utils";
import { nextResumeVersion } from "./queries";
import { CandidateProfileFormSchema } from "./schema";

export type UploadResumeResult =
  | { status: "success"; resumeId: string; textExtracted: boolean; profileUpdated: boolean; message: string }
  | { status: "error"; message: string };

export async function uploadResumeAction(formData: FormData): Promise<UploadResumeResult> {
  const user = await getCurrentUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Please choose a PDF file to upload." };
  }
  if (file.size > MAX_RESUME_BYTES) {
    return { status: "error", message: "That file is too large (max 8MB)." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isPdfBuffer(buffer)) {
    return { status: "error", message: "That doesn't look like a valid PDF file." };
  }

  const rawText = await extractResumeText(buffer);

  let parsed: ParsedResume | null = null;
  if (rawText) {
    try {
      parsed = await getAIProvider().parseResume({ rawText });
    } catch (err) {
      // AI_PROVIDER may be anthropic/openai, whose parseResume() isn't
      // implemented yet and throws unconditionally — the resume upload
      // itself must still succeed.
      console.warn("[resume] AI parsing failed:", (err as Error).message);
      parsed = null;
    }
  }

  let key: string;
  try {
    key = await saveResumeFile(user.id, buffer);
  } catch (err) {
    console.error("[resume] failed to save file:", (err as Error).message);
    return { status: "error", message: "Could not save the file. Please try again." };
  }

  const version = await nextResumeVersion(user.id);

  const createdResume = await prisma.$transaction(async (tx) => {
    await tx.resume.updateMany({
      where: { userId: user.id, isPrimary: true },
      data: { isPrimary: false },
    });
    return tx.resume.create({
      data: {
        userId: user.id,
        fileName: sanitizeDisplayName(file.name),
        fileUrl: key,
        version,
        rawText: rawText ?? undefined,
        parsedJson: parsed ?? undefined,
        isPrimary: true,
      },
    });
  });

  let profileUpdated = false;
  if (
    parsed &&
    (parsed.skills.length > 0 ||
      parsed.suggestedRoles.length > 0 ||
      parsed.headline !== null ||
      parsed.yearsExperience !== null)
  ) {
    // Same "latest resume wins" precedent skills already followed —
    // unconditionally overwrites from the freshest parse, no "only if
    // empty" guard. The user can still hand-edit any of these afterward
    // via the profile form; that's untouched by this.
    const data: { skills?: string[]; targetRoles?: string[]; headline?: string; yearsExperience?: number } = {};
    if (parsed.skills.length > 0) data.skills = parsed.skills;
    if (parsed.suggestedRoles.length > 0) data.targetRoles = parsed.suggestedRoles;
    if (parsed.headline !== null) data.headline = parsed.headline;
    if (parsed.yearsExperience !== null) data.yearsExperience = parsed.yearsExperience;

    await prisma.candidateProfile.upsert({
      where: { userId: user.id },
      update: data,
      create: { userId: user.id, ...data },
    });
    profileUpdated = true;
  }

  revalidatePath("/settings");

  const message = !rawText
    ? "Saved your resume, but couldn't read its text — fill in your profile manually below."
    : !profileUpdated
      ? "Saved your resume — automatic parsing didn't find anything, so fill in your profile manually below."
      : "Resume uploaded and profile updated.";

  return {
    status: "success",
    resumeId: createdResume.id,
    textExtracted: rawText !== null,
    profileUpdated,
    message,
  };
}

export type UpdateProfileResult =
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export async function updateCandidateProfileAction(formData: FormData): Promise<UpdateProfileResult> {
  const user = await getCurrentUser();

  const raw = {
    headline: formData.get("headline")?.toString() ?? "",
    yearsExperience: formData.get("yearsExperience")?.toString() || undefined,
    targetRoles: formData.get("targetRoles")?.toString() ?? "",
    targetLocations: formData.get("targetLocations")?.toString() ?? "",
    skills: formData.get("skills")?.toString() ?? "",
    excludedKeywords: formData.get("excludedKeywords")?.toString() ?? "",
    minSalary: formData.get("minSalary")?.toString() || undefined,
    maxSalary: formData.get("maxSalary")?.toString() || undefined,
    remoteOnly: formData.get("remoteOnly") === "on",
  };

  const parsed = CandidateProfileFormSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0] ?? "form")] = issue.message;
    }
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
  }

  const data = parsed.data;

  await prisma.candidateProfile.upsert({
    where: { userId: user.id },
    update: {
      headline: data.headline || null,
      yearsExperience: data.yearsExperience ?? null,
      targetRoles: parseCommaList(data.targetRoles ?? ""),
      targetLocations: parseCommaList(data.targetLocations ?? ""),
      skills: parseCommaList(data.skills ?? ""),
      excludedKeywords: parseCommaList(data.excludedKeywords ?? ""),
      minSalary: data.minSalary ?? null,
      maxSalary: data.maxSalary ?? null,
      remoteOnly: data.remoteOnly ?? false,
    },
    create: {
      userId: user.id,
      headline: data.headline || null,
      yearsExperience: data.yearsExperience ?? null,
      targetRoles: parseCommaList(data.targetRoles ?? ""),
      targetLocations: parseCommaList(data.targetLocations ?? ""),
      skills: parseCommaList(data.skills ?? ""),
      excludedKeywords: parseCommaList(data.excludedKeywords ?? ""),
      minSalary: data.minSalary ?? null,
      maxSalary: data.maxSalary ?? null,
      remoteOnly: data.remoteOnly ?? false,
    },
  });

  revalidatePath("/settings");
  return { status: "success" };
}
