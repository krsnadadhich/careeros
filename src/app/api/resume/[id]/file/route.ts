import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getResumeById } from "@/features/resume/queries";
import { readResumeFile, sanitizeDisplayName } from "@/lib/resume";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const resume = await getResumeById(user.id, id);

  if (!resume?.fileUrl) {
    return new NextResponse("Not found", { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await readResumeFile(user.id, resume.fileUrl);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${sanitizeDisplayName(resume.fileName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
