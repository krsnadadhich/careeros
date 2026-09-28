"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateInterviewNotes } from "../actions";

export function InterviewNotesForm({
  interviewId,
  initialNotes,
  initialCompleted,
}: {
  interviewId: string;
  initialNotes: string | null;
  initialCompleted: boolean;
}) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [completed, setCompleted] = useState(initialCompleted);
  const [isPending, startTransition] = useTransition();

  function onSave() {
    startTransition(async () => {
      const result = await updateInterviewNotes(interviewId, { notes: notes.trim() || null, completed });
      if (result.status === "success") toast.success("Saved.");
      else toast.error(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="notes" className="text-xs text-text3">
        What was actually asked (feeds future prep for this application)
      </Label>
      <textarea
        id="notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        className="rounded-md border border-line bg-surface-1 px-2.5 py-2 text-[13px] text-foreground outline-none"
      />
      <div className="flex items-center gap-2">
        <input
          id="completed"
          type="checkbox"
          checked={completed}
          onChange={(e) => setCompleted(e.target.checked)}
          className="h-3.5 w-3.5 accent-brand"
        />
        <Label htmlFor="completed" className="text-xs text-text2">Mark this round completed</Label>
      </div>
      <div>
        <Button size="sm" variant="outline" onClick={onSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save notes"}
        </Button>
      </div>
    </div>
  );
}
