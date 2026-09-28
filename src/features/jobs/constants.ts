// Pure constants/types only — no Prisma import — so client components
// (e.g. job-filters.tsx) can use these without pulling server-only code
// (Prisma -> pg -> Node "fs") into the client bundle.
export const JOBS_TABS = ["All", "Recommended", "High Match", "Saved", "Recently Added"] as const;
export type JobsTab = (typeof JOBS_TABS)[number];

export interface JobsFilters {
  tab: JobsTab;
  query: string;
  remoteOnly: boolean;
  savedOnly: boolean;
  minMatch: number;
}
