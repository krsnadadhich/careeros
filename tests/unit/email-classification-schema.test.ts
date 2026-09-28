import { describe, expect, it } from "vitest";
import { EmailClassificationSchema } from "@/lib/ai/types";

describe("EmailClassificationSchema", () => {
  it("accepts a valid classification payload", () => {
    const result = EmailClassificationSchema.safeParse({
      category: "INTERVIEWS",
      priority: "CRITICAL",
      importanceScore: 92,
      actionRequired: true,
      summary: "Interview scheduled for tomorrow.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a payload missing importanceScore", () => {
    const result = EmailClassificationSchema.safeParse({
      category: "JOBS",
      priority: "LOW",
      actionRequired: false,
      summary: "An email.",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid priority value", () => {
    const result = EmailClassificationSchema.safeParse({
      category: "JOBS",
      priority: "URGENT",
      importanceScore: 50,
      actionRequired: false,
      summary: "An email.",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an importanceScore outside 0-100", () => {
    const result = EmailClassificationSchema.safeParse({
      category: "JOBS",
      priority: "LOW",
      importanceScore: 150,
      actionRequired: false,
      summary: "An email.",
    });
    expect(result.success).toBe(false);
  });

  it("accepts every valid category", () => {
    for (const category of ["JOBS", "RECRUITERS", "INTERVIEWS", "ASSESSMENTS", "OFFERS", "OTHER"]) {
      const result = EmailClassificationSchema.safeParse({
        category,
        priority: "LOW",
        importanceScore: 10,
        actionRequired: false,
        summary: "x",
      });
      expect(result.success).toBe(true);
    }
  });
});
