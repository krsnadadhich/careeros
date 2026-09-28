import { EmptyState } from "@/components/shared/empty-state";
import { InterviewRow } from "./interview-row";
import type { InterviewWithApplication } from "../queries";

function Section({
  title,
  items,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  items: InterviewWithApplication[];
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
          {items.map((interview) => (
            <InterviewRow key={interview.id} interview={interview} />
          ))}
        </div>
      )}
    </div>
  );
}

export function InterviewList({
  upcoming,
  past,
}: {
  upcoming: InterviewWithApplication[];
  past: InterviewWithApplication[];
}) {
  return (
    <div className="flex flex-col gap-7">
      <Section
        title="Upcoming"
        items={upcoming}
        emptyTitle="No upcoming interviews"
        emptyDescription="Schedule one from an application, or use the button above."
      />
      <Section
        title="Past"
        items={past}
        emptyTitle="No past interviews yet"
        emptyDescription="Completed rounds will show up here once you log them."
      />
    </div>
  );
}
