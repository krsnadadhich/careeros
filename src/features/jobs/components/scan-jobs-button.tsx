"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { scanJobsAction } from "../actions";

export function ScanJobsButton() {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await scanJobsAction();
      if (result.status === "success") {
        const bits = [`${result.jobsCreated} new`];
        if (result.emailJobsCreated) bits.push(`${result.emailJobsCreated} from your inbox`);
        if (result.jobsSkipped) bits.push(`${result.jobsSkipped} already known`);
        if (result.jobsFiltered) bits.push(`${result.jobsFiltered} filtered`);
        if (result.matchesComputed) bits.push(`${result.matchesComputed} matched`);
        const failParts: string[] = [];
        if (result.errors > 0) failParts.push(`${result.errors} job errors`);
        if (result.matchesFailed > 0) failParts.push(`${result.matchesFailed} match errors`);
        const suffix = failParts.length > 0 ? ` (${failParts.join(", ")})` : "";
        toast.success(`Found ${result.jobsFound} jobs — ${bits.join(", ")}${suffix}`);
      } else {
        toast.error(result.message ?? "Job scan failed");
      }
    });
  }

  return (
    <Button size="sm" variant="outline" disabled={isPending} onClick={onClick}>
      {isPending ? "Scanning…" : "Scan for Jobs"}
    </Button>
  );
}
