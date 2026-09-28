import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { adzunaSource } from "@/lib/jobs/adzuna";
import type { JobSearchCriteria } from "@/lib/jobs/types";

function criteria(overrides: Partial<JobSearchCriteria> = {}): JobSearchCriteria {
  return { roles: ["AI Engineer"], locations: [], remoteOnly: false, ...overrides };
}

describe("adzunaSource.search — fresher-targeting query params", () => {
  const originalAppId = process.env.ADZUNA_APP_ID;
  const originalAppKey = process.env.ADZUNA_APP_KEY;

  beforeEach(() => {
    process.env.ADZUNA_APP_ID = "test-id";
    process.env.ADZUNA_APP_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) })
    );
  });

  afterEach(() => {
    process.env.ADZUNA_APP_ID = originalAppId;
    process.env.ADZUNA_APP_KEY = originalAppKey;
    vi.unstubAllGlobals();
  });

  it("includes what_or, what_exclude, and max_days_old on every search call", async () => {
    await adzunaSource.search(criteria());

    expect(fetch).toHaveBeenCalledTimes(1);
    const calledUrl = new URL((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("what_or")).toBe("fresher,entry level,graduate,junior,trainee");
    expect(calledUrl.searchParams.get("what_exclude")).toBe("senior,lead,principal,staff,architect");
    expect(calledUrl.searchParams.get("max_days_old")).toBe("14");
  });
});
