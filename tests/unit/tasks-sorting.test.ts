import { describe, expect, it } from "vitest";
import { splitTasksByCompleted } from "@/features/tasks/queries";
import type { Task } from "@prisma/client";

function makeTask(overrides: { id: string; completed: boolean; dueAt?: Date | null; createdAt?: Date }): Task {
  return {
    id: overrides.id,
    userId: "user-1",
    title: "Test task",
    description: null,
    dueAt: overrides.dueAt ?? null,
    completed: overrides.completed,
    source: "manual",
    createdAt: overrides.createdAt ?? new Date("2026-01-01"),
  } as Task;
}

describe("splitTasksByCompleted", () => {
  it("buckets by completed status", () => {
    const open = makeTask({ id: "1", completed: false });
    const done = makeTask({ id: "2", completed: true });
    const result = splitTasksByCompleted([open, done]);
    expect(result.open.map((t) => t.id)).toEqual(["1"]);
    expect(result.completed.map((t) => t.id)).toEqual(["2"]);
  });

  it("sorts open tasks by due date ascending, undated last", () => {
    const noDate = makeTask({ id: "no-date", completed: false, dueAt: null });
    const soon = makeTask({ id: "soon", completed: false, dueAt: new Date("2026-01-05") });
    const later = makeTask({ id: "later", completed: false, dueAt: new Date("2026-02-01") });
    const result = splitTasksByCompleted([later, noDate, soon]);
    expect(result.open.map((t) => t.id)).toEqual(["soon", "later", "no-date"]);
  });

  it("sorts completed tasks most-recently-created first", () => {
    const older = makeTask({ id: "older", completed: true, createdAt: new Date("2026-01-01") });
    const newer = makeTask({ id: "newer", completed: true, createdAt: new Date("2026-02-01") });
    const result = splitTasksByCompleted([older, newer]);
    expect(result.completed.map((t) => t.id)).toEqual(["newer", "older"]);
  });
});
