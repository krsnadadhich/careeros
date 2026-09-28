"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateInterviewPrepAction } from "../actions";

export function GeneratePrepButton({ interviewId }: { interviewId: string }) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await generateInterviewPrepAction(interviewId);
      if (result.status === "success") {
        toast.success("Prep notes generated.");
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Button size="sm" onClick={onClick} disabled={isPending}>
      {isPending ? "Generating…" : "Generate Prep"}
    </Button>
  );
}
