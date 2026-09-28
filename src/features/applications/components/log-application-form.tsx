"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logApplicationAction } from "../actions";

function todayInputValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function LogApplicationForm() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await logApplicationAction(formData);
      if (result.status === "success") {
        toast.success("Application logged.");
        router.push(`/jobs/${result.jobId}`);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex max-w-md flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <Label htmlFor="company" className="text-xs text-text3">Company</Label>
        <Input id="company" name="company" placeholder="Acme Corp" required className="h-8 text-xs" />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="role" className="text-xs text-text3">Role</Label>
        <Input id="role" name="role" placeholder="Senior Backend Engineer" required className="h-8 text-xs" />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="location" className="text-xs text-text3">Location (optional)</Label>
        <Input id="location" name="location" placeholder="Remote, Bangalore..." className="h-8 text-xs" />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="source" className="text-xs text-text3">Where you found it</Label>
        <select
          id="source"
          name="source"
          defaultValue="OTHER"
          className="h-8 rounded-md border border-line bg-surface-1 px-2 text-[13px] text-foreground outline-none"
        >
          <option value="LINKEDIN">LinkedIn</option>
          <option value="INDEED">Indeed</option>
          <option value="COMPANY_WEBSITE">Company Website</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="sourceUrl" className="text-xs text-text3">Job link (optional)</Label>
        <Input id="sourceUrl" name="sourceUrl" placeholder="https://..." className="h-8 text-xs" />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="appliedAt" className="text-xs text-text3">Applied on</Label>
        <Input id="appliedAt" name="appliedAt" type="date" defaultValue={todayInputValue()} className="h-8 text-xs" />
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Logging…" : "Log Application"}
        </Button>
      </div>
    </form>
  );
}
