import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getProgress } from "@/lib/gmail/sync-progress";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json(getProgress(user.id));
}
