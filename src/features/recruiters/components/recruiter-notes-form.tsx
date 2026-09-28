"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateRecruiterNotes } from "../actions";

export function RecruiterNotesForm({ recruiterId, initialNotes }: { recruiterId: string; initialNotes: string | null }) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [isPending, startTransition] = useTransition();

  function onSave() {
    startTransition(async () => {
      const result = await updateRecruiterNotes(recruiterId, notes.trim() || null);
      if (result.status === "success") toast.success("Saved.");
      else toast.error(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="recruiter-notes" className="text-xs text-text3">
        Notes
      </Label>
      <textarea
        id="recruiter-notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        placeholder="Anything worth remembering about this recruiter..."
        className="rounded-md border border-line bg-surface-1 px-2.5 py-2 text-[13px] text-foreground outline-none"
      />
      <div>
        <Button size="sm" variant="outline" onClick={onSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save notes"}
        </Button>
      </div>
    </div>
  );
}
