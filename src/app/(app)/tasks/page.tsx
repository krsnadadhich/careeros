import { getCurrentUser } from "@/lib/auth/session";
import { getTasksForUser, splitTasksByCompleted } from "@/features/tasks/queries";
import { NewTaskForm } from "@/features/tasks/components/new-task-form";
import { TaskList } from "@/features/tasks/components/task-list";

export default async function TasksPage() {
  const user = await getCurrentUser();
  const tasks = await getTasksForUser(user.id);
  const { open, completed } = splitTasksByCompleted(tasks);

  return (
    <div className="mx-auto max-w-[900px] px-8 py-6 pb-16">
      <div className="mb-5 text-lg font-semibold">Tasks</div>
      <div className="mb-7">
        <NewTaskForm />
      </div>
      <TaskList open={open} completed={completed} />
    </div>
  );
}
