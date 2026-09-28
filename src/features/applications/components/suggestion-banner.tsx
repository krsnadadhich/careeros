"use client";

import { useTransition } from "react";
import type { ApplicationStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { STAGE_LABEL } from "./kanban-column";
import { confirmApplicationStatusSuggestion, ignoreApplicationStatusSuggestion } from "../actions";

export function SuggestionBanner({
  applicationId,
  suggestedStatus,
  suggestedReason,
}: {
  applicationId: string;
  suggestedStatus: ApplicationStatus;
  suggestedReason: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mt-1.5 rounded-md border border-line bg-surface-2 px-2 py-1.5 text-[11px]">
      <div className="text-text2">→ {STAGE_LABEL[suggestedStatus]}</div>
      {suggestedReason && <div className="mt-0.5 text-text3">{suggestedReason}</div>}
      <div className="mt-1.5 flex gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[10.5px]"
          disabled={isPending}
          onClick={() => startTransition(() => confirmApplicationStatusSuggestion(applicationId))}
        >
          Confirm
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[10.5px]"
          disabled={isPending}
          onClick={() => startTransition(() => ignoreApplicationStatusSuggestion(applicationId))}
        >
          Ignore
        </Button>
      </div>
    </div>
  );
}
