"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export type ActionResult = { status: "success" } | { status: "error"; message: string };

export async function createTaskAction(input: {
  title: string;
  description: string | null;
  dueAt: Date | null;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  const title = input.title.trim();
  if (!title) return { status: "error", message: "Title is required." };

  await prisma.task.create({
    data: { userId: user.id, title, description: input.description, dueAt: input.dueAt, source: "manual" },
  });

  revalidatePath("/tasks");
  revalidatePath("/overview");
  return { status: "success" };
}

export async function setTaskCompletedAction(taskId: string, completed: boolean): Promise<ActionResult> {
  const user = await getCurrentUser();

  const result = await prisma.task.updateMany({
    where: { id: taskId, userId: user.id },
    data: { completed },
  });
  if (result.count === 0) return { status: "error", message: "Task not found." };

  revalidatePath("/tasks");
  revalidatePath("/overview");
  return { status: "success" };
}

export async function deleteTaskAction(taskId: string): Promise<ActionResult> {
  const user = await getCurrentUser();

  const result = await prisma.task.deleteMany({ where: { id: taskId, userId: user.id } });
  if (result.count === 0) return { status: "error", message: "Task not found." };

  revalidatePath("/tasks");
  revalidatePath("/overview");
  return { status: "success" };
}
