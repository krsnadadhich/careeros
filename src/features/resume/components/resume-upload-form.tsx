"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadResumeAction } from "../actions";

export function ResumeUploadForm({ label = "Upload" }: { label?: string }) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await uploadResumeAction(formData);
      if (result.status === "success") {
        toast.success(result.message);
        formRef.current?.reset();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex items-center gap-2">
      <Input
        type="file"
        name="file"
        accept="application/pdf"
        required
        disabled={isPending}
        className="h-8 max-w-64 text-xs"
      />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Uploading…" : label}
      </Button>
    </form>
  );
}
