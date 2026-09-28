import { EmptyState } from "@/components/shared/empty-state";
import { TaskRow } from "./task-row";
import type { Task } from "@prisma/client";

function Section({
  title,
  tasks,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  tasks: Task[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <div>
      <div className="mb-2.5 text-[13px] font-semibold">{title}</div>
      {tasks.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface-1">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TaskList({ open, completed }: { open: Task[]; completed: Task[] }) {
  return (
    <div className="flex flex-col gap-7">
      <Section
        title="Open"
        tasks={open}
        emptyTitle="Nothing on your list"
        emptyDescription="Add a task above to keep track of what's next."
      />
      <Section
        title="Completed"
        tasks={completed}
        emptyTitle="No completed tasks yet"
        emptyDescription="Tasks you check off will show up here."
      />
    </div>
  );
}
