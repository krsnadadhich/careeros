import { EmptyState } from "@/components/shared/empty-state";
import { RecruiterRow } from "./recruiter-row";
import type { RecruiterWithEmails } from "../queries";

function Section({
  title,
  items,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  items: RecruiterWithEmails[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <div>
      <div className="mb-2.5 text-[13px] font-semibold">{title}</div>
      {items.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((recruiter) => (
            <RecruiterRow key={recruiter.id} recruiter={recruiter} />
          ))}
        </div>
      )}
    </div>
  );
}

export function RecruiterList({
  needsFollowUp,
  upToDate,
}: {
  needsFollowUp: RecruiterWithEmails[];
  upToDate: RecruiterWithEmails[];
}) {
  return (
    <div className="flex flex-col gap-7">
      <Section
        title="Needs Follow-up"
        items={needsFollowUp}
        emptyTitle="Nothing needs a follow-up"
        emptyDescription="Recruiters you haven't heard from in a while will show up here."
      />
      <Section
        title="All Recruiters"
        items={upToDate}
        emptyTitle="No recruiter contacts yet"
        emptyDescription="Recruiters mentioned in your synced emails will show up here automatically."
      />
    </div>
  );
}
