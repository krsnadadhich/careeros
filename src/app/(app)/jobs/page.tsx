import { getCurrentUser } from "@/lib/auth/session";
import { getFilteredJobs, hasTargetRoles, JOBS_TABS, type JobsTab } from "@/features/jobs/queries";
import { JobFilters } from "@/features/jobs/components/job-filters";
import { JobRow } from "@/features/jobs/components/job-row";
import { ScanJobsButton } from "@/features/jobs/components/scan-jobs-button";
import { EmptyState } from "@/components/shared/empty-state";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    remote?: string;
    saved?: string;
    minMatch?: string;
  }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  const tab = (JOBS_TABS as readonly string[]).includes(params.tab ?? "")
    ? (params.tab as JobsTab)
    : "All";

  const [jobs, configured] = await Promise.all([
    getFilteredJobs(user.id, {
      tab,
      query: params.q ?? "",
      remoteOnly: params.remote === "1",
      savedOnly: params.saved === "1",
      minMatch: Number(params.minMatch ?? 0),
    }),
    hasTargetRoles(user.id),
  ]);

  return (
    <div className="mx-auto max-w-[1180px] px-8 py-6 pb-16">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="text-lg font-semibold">Jobs</div>
        <ScanJobsButton />
      </div>
      <JobFilters jobCount={jobs.length} />
      {jobs.length === 0 ? (
        configured ? (
          <EmptyState
            title="No jobs match these filters yet"
            description="Once job discovery is connected, matching opportunities will show up here."
          />
        ) : (
          <EmptyState
            title="Set up your job search profile first"
            description="Add target roles in Settings, then click Scan for Jobs to discover opportunities."
          />
        )
      ) : (
        <div className="flex flex-col gap-2">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
