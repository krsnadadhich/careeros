"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markRecruiterContacted } from "../actions";

export function MarkContactedButton({ recruiterId }: { recruiterId: string }) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await markRecruiterContacted(recruiterId);
      if (result.status === "success") toast.success("Logged as contacted today.");
      else toast.error(result.message);
    });
  }

  return (
    <Button size="sm" variant="outline" onClick={onClick} disabled={isPending}>
      {isPending ? "Saving…" : "Log contact today"}
    </Button>
  );
}
