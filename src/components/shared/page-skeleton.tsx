import { Skeleton } from "@/components/ui/skeleton";

/** Generic route-level loading skeleton, rendered instantly by Next's
 * `loading.tsx` convention while a page's Server Component data fetch is
 * still in flight — replaces a blank screen during navigation. Dimensions
 * are approximate on purpose: this is a perceived-latency placeholder, not
 * a pixel-exact preview of each page's real layout. */
export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-[1180px] px-8 py-7 pb-16">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="mt-2 h-4 w-72" />

      <div className="mt-6 grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>

      <div className="mt-7 flex flex-col gap-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/** Loading skeleton for a `[id]` detail route — header block plus a couple
 * of content sections, mirroring the shape shared by the detail pages
 * (job/application/interview/recruiter/email). */
export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1180px] px-8 py-7 pb-16">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="mt-2 h-4 w-40" />

      <div className="mt-7 flex flex-col gap-3">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    </div>
  );
}
