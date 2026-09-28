"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { JOBS_TABS, type JobsTab } from "../constants";

export function JobFilters({ jobCount }: { jobCount: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = (searchParams.get("tab") as JobsTab) ?? "All";
  const query = searchParams.get("q") ?? "";
  const remote = searchParams.get("remote") === "1";
  const saved = searchParams.get("saved") === "1";
  const minMatch = Number(searchParams.get("minMatch") ?? 0);

  function update(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    router.push(`/jobs?${params.toString()}`);
  }

  return (
    <div className="mb-3.5 flex flex-col gap-2.5">
      <Input
        defaultValue={query}
        placeholder="Search jobs, companies, skills..."
        className="h-9 bg-surface-1 text-[13px]"
        onChange={(e) => update({ q: e.target.value })}
      />
      <div className="flex flex-wrap items-center gap-2">
        {JOBS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => update({ tab: t === "All" ? null : t })}
            className={cn(
              "rounded-md px-3 py-1.5 text-[12.5px]",
              tab === t ? "bg-surface-2 text-foreground" : "text-text2 hover:bg-surface-2"
            )}
          >
            {t}
          </button>
        ))}
        <div className="mx-1 h-4 w-px bg-line" />
        <button
          onClick={() => update({ remote: remote ? null : "1" })}
          className={cn(
            "rounded-md border border-line px-3 py-1.5 text-[12.5px]",
            remote ? "bg-surface-2 text-foreground" : "text-text2"
          )}
        >
          Remote
        </button>
        <button
          onClick={() => update({ saved: saved ? null : "1" })}
          className={cn(
            "rounded-md border border-line px-3 py-1.5 text-[12.5px]",
            saved ? "bg-surface-2 text-foreground" : "text-text2"
          )}
        >
          Saved
        </button>
        <button
          onClick={() => update({ minMatch: minMatch >= 90 ? null : String(minMatch + 15) })}
          className="rounded-md border border-line px-3 py-1.5 text-[12.5px] text-text2"
        >
          Match ≥ {minMatch}%
        </button>
      </div>
      <div className="text-[11.5px] text-text3">{jobCount} jobs</div>
    </div>
  );
}
