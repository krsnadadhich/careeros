"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyBriefButton({
  role,
  company,
  sourceUrl,
  brief,
}: {
  role: string;
  company: string;
  sourceUrl: string | null;
  brief: string;
}) {
  async function onClick() {
    const parts = [
      `${role} at ${company}`,
      sourceUrl ? `Job link: ${sourceUrl}` : null,
      "",
      brief,
    ].filter((p): p is string => p !== null);

    try {
      await navigator.clipboard.writeText(parts.join("\n"));
      toast.success("Copied — paste it wherever you're applying.");
    } catch {
      toast.error("Couldn't copy to clipboard.");
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={onClick}>
      Copy Application Brief
    </Button>
  );
}
