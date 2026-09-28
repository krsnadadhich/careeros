"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { generateDailyBriefForUser, type GenerateBriefResult } from "./generate";

export async function generateBriefAction(): Promise<GenerateBriefResult> {
  const user = await getCurrentUser();
  const result = await generateDailyBriefForUser(user.id);
  if (result.status === "success") revalidatePath("/overview");
  return result;
}
