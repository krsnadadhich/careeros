import type { Email } from "@prisma/client";
import { EmptyState } from "@/components/shared/empty-state";
import { EmailRow } from "./email-row";

export function EmailList({ emails }: { emails: Email[] }) {
  if (emails.length === 0) {
    return (
      <EmptyState
        title="No emails in this category yet"
        description="Once Gmail is connected, relevant emails will show up here with an AI summary."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface-1">
      {emails.map((e) => (
        <EmailRow key={e.id} email={e} />
      ))}
    </div>
  );
}
