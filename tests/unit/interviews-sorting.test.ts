import { describe, expect, it } from "vitest";
import { splitUpcomingAndPast, tryParseInterviewDate } from "@/features/interviews/queries";
import type { InterviewWithApplication } from "@/features/interviews/queries";

function makeInterview(overrides: { id: string; scheduledAt: Date | null; completed: boolean }): InterviewWithApplication {
  return {
    id: overrides.id,
    userId: "user-1",
    applicationId: "app-1",
    type: null,
    scheduledAt: overrides.scheduledAt,
    location: null,
    notes: null,
    prepNotes: null,
    completed: overrides.completed,
    createdAt: new Date(),
    application: {} as InterviewWithApplication["application"],
  } as InterviewWithApplication;
}

const NOW = new Date("2026-06-15T12:00:00Z");
const PAST_DATE = new Date("2026-06-01T12:00:00Z");
const FUTURE_DATE = new Date("2026-07-01T12:00:00Z");
const SOONER_FUTURE = new Date("2026-06-20T12:00:00Z");

describe("splitUpcomingAndPast", () => {
  it("puts a completed interview in past regardless of date", () => {
    const i = makeInterview({ id: "1", scheduledAt: FUTURE_DATE, completed: true });
    const { upcoming, past } = splitUpcomingAndPast([i], NOW);
    expect(past.map((x) => x.id)).toEqual(["1"]);
    expect(upcoming).toHaveLength(0);
  });

  it("puts a future-dated, not-completed interview in upcoming", () => {
    const i = makeInterview({ id: "1", scheduledAt: FUTURE_DATE, completed: false });
    const { upcoming, past } = splitUpcomingAndPast([i], NOW);
    expect(upcoming.map((x) => x.id)).toEqual(["1"]);
    expect(past).toHaveLength(0);
  });

  it("puts a not-yet-scheduled, not-completed interview in upcoming", () => {
    const i = makeInterview({ id: "1", scheduledAt: null, completed: false });
    const { upcoming } = splitUpcomingAndPast([i], NOW);
    expect(upcoming.map((x) => x.id)).toEqual(["1"]);
  });

  it("puts a past-dated but never-completed interview in past (missed logging)", () => {
    const i = makeInterview({ id: "1", scheduledAt: PAST_DATE, completed: false });
    const { past, upcoming } = splitUpcomingAndPast([i], NOW);
    expect(past.map((x) => x.id)).toEqual(["1"]);
    expect(upcoming).toHaveLength(0);
  });

  it("sorts upcoming ascending and past descending", () => {
    const interviews = [
      makeInterview({ id: "future-far", scheduledAt: FUTURE_DATE, completed: false }),
      makeInterview({ id: "future-soon", scheduledAt: SOONER_FUTURE, completed: false }),
      makeInterview({ id: "past-recent", scheduledAt: PAST_DATE, completed: true }),
      makeInterview({ id: "past-older", scheduledAt: new Date("2026-05-01T12:00:00Z"), completed: true }),
    ];
    const { upcoming, past } = splitUpcomingAndPast(interviews, NOW);
    expect(upcoming.map((x) => x.id)).toEqual(["future-soon", "future-far"]);
    expect(past.map((x) => x.id)).toEqual(["past-recent", "past-older"]);
  });
});

describe("tryParseInterviewDate", () => {
  it("returns null for null/undefined/empty input", () => {
    expect(tryParseInterviewDate(null)).toBeNull();
    expect(tryParseInterviewDate(undefined)).toBeNull();
    expect(tryParseInterviewDate("")).toBeNull();
    expect(tryParseInterviewDate("   ")).toBeNull();
  });

  it("returns null for vague, non-date LLM extraction values", () => {
    expect(tryParseInterviewDate("TBD")).toBeNull();
    expect(tryParseInterviewDate("soon")).toBeNull();
    expect(tryParseInterviewDate("next week")).toBeNull();
  });

  it("parses a valid ISO date string", () => {
    const result = tryParseInterviewDate("2026-07-01T10:00:00Z");
    expect(result).toBeInstanceOf(Date);
    expect(result?.getTime()).toBe(new Date("2026-07-01T10:00:00Z").getTime());
  });
});
