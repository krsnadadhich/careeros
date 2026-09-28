"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { confirmInterviewSuggestionAction, dismissInterviewSuggestionAction } from "../actions";
import type { InterviewSuggestion } from "../queries";
import { groupByDay } from "@/lib/group-by-day";

function SuggestionRow({ suggestion }: { suggestion: InterviewSuggestion }) {
  const [isPending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const result = await confirmInterviewSuggestionAction(suggestion.emailId, suggestion.applicationId);
      if (result.status === "success") toast.success("Interview logged.");
      else toast.error(result.message);
    });
  }

  function onDismiss() {
    startTransition(async () => {
      const result = await dismissInterviewSuggestionAction(suggestion.emailId);
      if (result.status === "error") toast.error(result.message);
    });
  }

  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold">
          {suggestion.company} <span className="font-normal text-text2">— {suggestion.role}</span>
        </div>
        <div className="mt-0.5 truncate text-[11.5px] text-text3">{suggestion.subject}</div>
      </div>
      <div className="flex flex-none gap-1.5">
        <Button size="sm" onClick={onConfirm} disabled={isPending}>
          Log Interview
        </Button>
        <Button size="sm" variant="outline" onClick={onDismiss} disabled={isPending}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}

export function SuggestedInterviews({ suggestions }: { suggestions: InterviewSuggestion[] }) {
  if (suggestions.length === 0) return null;

  const groups = groupByDay(suggestions, (s) => s.receivedAt);

  return (
    <div className="mb-7">
      <div className="mb-2.5 text-[13px] font-semibold">
        Found in your inbox <span className="font-normal text-text3">— looks like an interview invite?</span>
      </div>
      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.dateLabel}>
            <div className="mb-1.5 text-[11px] font-medium tracking-wide text-text3 uppercase">
              {group.dateLabel}
            </div>
            <div className="overflow-hidden rounded-lg border border-brand-dim bg-surface-1">
              {group.items.map((s) => (
                <SuggestionRow key={s.emailId} suggestion={s} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
