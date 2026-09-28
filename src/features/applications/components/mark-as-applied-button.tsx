"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trackApplicationAction } from "../actions";

export function MarkAsAppliedButton({ jobId }: { jobId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onClick() {
    startTransition(async () => {
      const result = await trackApplicationAction(jobId);
      if (result.status === "success") {
        toast.success("Tracking this application.");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Button size="sm" variant="outline" onClick={onClick} disabled={isPending}>
      {isPending ? "Saving…" : "Mark as Applied"}
    </Button>
  );
}
