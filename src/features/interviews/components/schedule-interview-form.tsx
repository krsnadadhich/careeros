"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Application, Job } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { scheduleInterviewAction } from "../actions";

type ApplicationOption = Application & { job: Pick<Job, "role" | "company"> };

function toLocalDatetimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ScheduleInterviewForm({
  applications,
  defaultApplicationId,
  defaultDateHint,
}: {
  applications: ApplicationOption[];
  defaultApplicationId?: string;
  defaultDateHint?: Date | null;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await scheduleInterviewAction(formData);
      if (result.status === "success") {
        toast.success("Interview scheduled.");
        router.push(`/interviews/${result.interviewId}`);
      } else {
        toast.error(result.message);
      }
    });
  }

  if (applications.length === 0) {
    return (
      <p className="text-sm text-text3">
        You don&apos;t have any applications yet — track one from a job first.
      </p>
    );
  }

  return (
    <form action={handleSubmit} className="flex max-w-md flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <Label htmlFor="applicationId" className="text-xs text-text3">Application</Label>
        <select
          id="applicationId"
          name="applicationId"
          defaultValue={defaultApplicationId ?? applications[0].id}
          className="h-8 rounded-md border border-line bg-surface-1 px-2 text-[13px] text-foreground outline-none"
        >
          {applications.map((app) => (
            <option key={app.id} value={app.id}>
              {app.job.role} — {app.job.company}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="type" className="text-xs text-text3">Round type</Label>
        <Input id="type" name="type" placeholder="Phone Screen, Technical, Onsite..." className="h-8 text-xs" />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="scheduledAt" className="text-xs text-text3">Date & time (optional)</Label>
        <Input
          id="scheduledAt"
          name="scheduledAt"
          type="datetime-local"
          defaultValue={defaultDateHint ? toLocalDatetimeInputValue(defaultDateHint) : ""}
          className="h-8 text-xs"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="location" className="text-xs text-text3">Location / link (optional)</Label>
        <Input id="location" name="location" placeholder="Zoom, onsite address..." className="h-8 text-xs" />
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Scheduling…" : "Schedule Interview"}
        </Button>
      </div>
    </form>
  );
}
