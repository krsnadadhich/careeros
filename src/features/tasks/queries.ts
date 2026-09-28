import { prisma } from "@/lib/db/prisma";
import type { Task } from "@prisma/client";

export async function getTasksForUser(userId: string): Promise<Task[]> {
  return prisma.task.findMany({ where: { userId } });
}

/** Pure bucketing, mirroring interviews' splitUpcomingAndPast — not a DB
 * query, unit-tested directly. Open tasks sort by due date (soonest
 * first, undated last); completed tasks sort most-recently-created
 * first, since there's no separate completedAt timestamp to sort by. */
export function splitTasksByCompleted(tasks: Task[]): { open: Task[]; completed: Task[] } {
  const open: Task[] = [];
  const completed: Task[] = [];

  for (const task of tasks) {
    if (task.completed) completed.push(task);
    else open.push(task);
  }

  open.sort((a, b) => (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity));
  completed.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return { open, completed };
}
