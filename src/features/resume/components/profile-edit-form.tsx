"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { CandidateProfile } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCandidateProfileAction } from "../actions";

export function ProfileEditForm({ profile }: { profile: CandidateProfile | null }) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSubmit(formData: FormData) {
    setFieldErrors({});
    startTransition(async () => {
      const result = await updateCandidateProfileAction(formData);
      if (result.status === "success") {
        toast.success("Profile saved.");
      } else {
        toast.error(result.message);
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  }

  return (
    <form action={handleSubmit} className="mt-3 flex flex-col gap-3 border-t border-line pt-3.5">
      <div className="text-[13px] font-semibold">Edit profile</div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="headline" className="text-xs text-text3">Headline</Label>
          <Input id="headline" name="headline" defaultValue={profile?.headline ?? ""} className="h-8 text-xs" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="yearsExperience" className="text-xs text-text3">Years of experience</Label>
          <Input
            id="yearsExperience"
            name="yearsExperience"
            type="number"
            min={0}
            defaultValue={profile?.yearsExperience ?? ""}
            className="h-8 text-xs"
          />
          {fieldErrors.yearsExperience && (
            <span className="text-[11px] text-danger">{fieldErrors.yearsExperience}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="targetRoles" className="text-xs text-text3">Target roles (comma-separated)</Label>
        <Input
          id="targetRoles"
          name="targetRoles"
          defaultValue={profile?.targetRoles.join(", ") ?? ""}
          placeholder="AI Engineer, GenAI Engineer"
          className="h-8 text-xs"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="targetLocations" className="text-xs text-text3">Target locations (comma-separated)</Label>
        <Input
          id="targetLocations"
          name="targetLocations"
          defaultValue={profile?.targetLocations.join(", ") ?? ""}
          placeholder="Bangalore, Remote"
          className="h-8 text-xs"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="skills" className="text-xs text-text3">Skills (comma-separated)</Label>
        <Input
          id="skills"
          name="skills"
          defaultValue={profile?.skills.join(", ") ?? ""}
          placeholder="Python, LLMs, RAG"
          className="h-8 text-xs"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="excludedKeywords" className="text-xs text-text3">Exclude keywords (comma-separated)</Label>
        <Input
          id="excludedKeywords"
          name="excludedKeywords"
          defaultValue={profile?.excludedKeywords.join(", ") ?? ""}
          placeholder="manual QA, pure frontend"
          className="h-8 text-xs"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="minSalary" className="text-xs text-text3">Min salary</Label>
          <Input
            id="minSalary"
            name="minSalary"
            type="number"
            min={0}
            defaultValue={profile?.minSalary ?? ""}
            className="h-8 text-xs"
          />
          {fieldErrors.minSalary && <span className="text-[11px] text-danger">{fieldErrors.minSalary}</span>}
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="maxSalary" className="text-xs text-text3">Max salary</Label>
          <Input
            id="maxSalary"
            name="maxSalary"
            type="number"
            min={0}
            defaultValue={profile?.maxSalary ?? ""}
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="remoteOnly"
          name="remoteOnly"
          type="checkbox"
          defaultChecked={profile?.remoteOnly ?? false}
          className="h-3.5 w-3.5 accent-brand"
        />
        <Label htmlFor="remoteOnly" className="text-xs text-text2">Remote only</Label>
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
