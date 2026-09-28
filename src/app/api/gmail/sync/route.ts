import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { syncNewMessages } from "@/lib/gmail";

export async function POST() {
  const user = await getCurrentUser();
  const result = await syncNewMessages(user.id);
  return NextResponse.json(result);
}
