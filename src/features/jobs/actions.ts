"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { scanForJobs, type JobScanResult } from "@/lib/jobs";

export async function scanJobsAction(): Promise<JobScanResult> {
  const user = await getCurrentUser();
  const result = await scanForJobs(user.id);
  if (result.status === "success") {
    revalidatePath("/jobs");
    revalidatePath("/overview");
  }
  return result;
}
