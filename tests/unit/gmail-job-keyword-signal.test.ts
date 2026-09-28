import { describe, expect, it } from "vitest";
import { looksJobRelatedByKeyword } from "@/lib/gmail/job-keyword-signal";

describe("looksJobRelatedByKeyword", () => {
  it("matches real application-confirmation subjects (the case extraction must never skip)", () => {
    expect(looksJobRelatedByKeyword("Thanks for applying to Acme")).toBe(true);
    expect(looksJobRelatedByKeyword("Your application was sent to Acme")).toBe(true);
  });

  it("matches other job-search vocabulary", () => {
    expect(looksJobRelatedByKeyword("Interview scheduled with Acme")).toBe(true);
    expect(looksJobRelatedByKeyword("Assessment invitation")).toBe(true);
    expect(looksJobRelatedByKeyword("Offer letter enclosed")).toBe(true);
    expect(looksJobRelatedByKeyword("A recruiter wants to connect")).toBe(true);
    expect(looksJobRelatedByKeyword("New job posting: Backend Engineer")).toBe(true);
  });

  it("returns false for genuinely unrelated subjects", () => {
    expect(looksJobRelatedByKeyword("Your statement is ready")).toBe(false);
    expect(looksJobRelatedByKeyword("Your package has shipped")).toBe(false);
    expect(looksJobRelatedByKeyword("Weekly newsletter digest")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(looksJobRelatedByKeyword("APPLYING NOW")).toBe(true);
  });
});
