"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateBriefAction } from "../actions";

export function GenerateBriefButton() {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await generateBriefAction();
      if (result.status === "success") toast.success("Brief refreshed.");
      else toast.error(result.message);
    });
  }

  return (
    <Button size="sm" variant="outline" onClick={onClick} disabled={isPending}>
      {isPending ? "Refreshing…" : "Refresh Brief"}
    </Button>
  );
}
