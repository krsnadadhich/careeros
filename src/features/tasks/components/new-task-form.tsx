"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTaskAction } from "../actions";

export function NewTaskForm() {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      const result = await createTaskAction({
        title,
        description: null,
        dueAt: dueAt ? new Date(dueAt) : null,
      });
      if (result.status === "success") {
        setTitle("");
        setDueAt("");
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task..."
        className="h-8 flex-1 text-xs"
      />
      <Input
        type="date"
        value={dueAt}
        onChange={(e) => setDueAt(e.target.value)}
        className="h-8 w-36 text-xs"
      />
      <Button type="submit" size="sm" className="h-8" disabled={isPending || !title.trim()}>
        {isPending ? "Adding…" : "Add"}
      </Button>
    </form>
  );
}
