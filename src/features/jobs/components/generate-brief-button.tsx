"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateApplicationBriefAction } from "../brief-actions";

export function GenerateBriefButton({ jobId, hasBrief }: { jobId: string; hasBrief: boolean }) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await generateApplicationBriefAction(jobId);
      if (result.status === "success") toast.success("Application brief generated.");
      else toast.error(result.message);
    });
  }

  return (
    <Button size="sm" onClick={onClick} disabled={isPending}>
      {isPending ? "Generating…" : hasBrief ? "Regenerate Brief" : "Prepare Application"}
    </Button>
  );
}
