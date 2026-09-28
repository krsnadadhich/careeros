"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@prisma/client";
import { formatDate } from "@/lib/utils";
import { setTaskCompletedAction, deleteTaskAction } from "../actions";

export function TaskRow({ task }: { task: Task }) {
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await setTaskCompletedAction(task.id, !task.completed);
      if (result.status === "error") toast.error(result.message);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteTaskAction(task.id);
      if (result.status === "error") toast.error(result.message);
    });
  }

  const overdue = !task.completed && task.dueAt !== null && task.dueAt < new Date();

  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={toggle}
        disabled={isPending}
        className="size-3.5 flex-none accent-brand"
      />
      <div className="min-w-0 flex-1">
        <div className={`text-[13px] font-semibold ${task.completed ? "text-text3 line-through" : ""}`}>
          {task.title}
        </div>
        {task.description && <div className="mt-0.5 text-[12.5px] text-text2">{task.description}</div>}
      </div>
      {task.dueAt && (
        <div className={`flex-none text-[11px] ${overdue ? "text-warning" : "text-text3"}`}>
          {formatDate(task.dueAt)}
        </div>
      )}
      <button
        onClick={remove}
        disabled={isPending}
        aria-label="Delete task"
        className="flex-none text-text3 hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
