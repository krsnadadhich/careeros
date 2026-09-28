"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { syncNewMessages, type SyncResult } from "@/lib/gmail";

export async function syncGmailAction(): Promise<SyncResult> {
  const user = await getCurrentUser();
  const result = await syncNewMessages(user.id);
  revalidatePath("/inbox");
  revalidatePath("/overview");
  revalidatePath("/settings");
  revalidatePath("/applications");
  revalidatePath("/jobs");
  return result;
}
