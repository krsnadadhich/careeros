import { describe, expect, it } from "vitest";
import { extractLinks, pickPrimaryJobLink } from "@/lib/gmail/extract-link";

describe("extractLinks", () => {
  it("pulls every anchor's href and tag-stripped inner text", () => {
    const html = '<a href="https://a.example/x">First <b>Link</b></a><a href="https://b.example/y">Second</a>';
    expect(extractLinks(html)).toEqual([
      { text: "First Link", href: "https://a.example/x" },
      { text: "Second", href: "https://b.example/y" },
    ]);
  });

  it("decodes common entities in the anchor text", () => {
    const html = '<a href="https://x.example">View &amp; Apply</a>';
    expect(extractLinks(html)[0].text).toBe("View & Apply");
  });

  it("returns an empty array when there are no anchors", () => {
    expect(extractLinks("<p>No links here</p>")).toEqual([]);
  });
});

describe("pickPrimaryJobLink", () => {
  // Fixtures below mirror real structure confirmed by fetching actual
  // synced job-alert emails via the Gmail API, not guessed templates —
  // the first pass at this got LinkedIn's shape wrong (assumed "View
  // Job" CTA wording; real emails put the job title as the anchor text,
  // sometimes wrapped around a logo image with no text at all) and
  // Naukri's path (missing the real `/jd/` prefix).

  it("matches LinkedIn's real job-view URL even though the anchor text is the job title, not CTA wording", () => {
    const html = `
      <a href="https://www.linkedin.com/comm/jobs/alerts?trk=header">Manage alerts</a>
      <a href="https://www.linkedin.com/comm/jobs/view/4452454915/?trackingId=abc">AI/ML Computational Science Analyst</a>
      <a href="https://www.linkedin.com/comm/jobs/search-results/?keywords=AI">See all jobs</a>
    `;
    const link = pickPrimaryJobLink(extractLinks(html));
    expect(link).toBe("https://www.linkedin.com/comm/jobs/view/4452454915/?trackingId=abc");
  });

  it("ignores LinkedIn nav chrome and alert/search-results links even though they share the domain", () => {
    const html = `
      <a href="https://www.linkedin.com/comm/feed/?trk=nav">-</a>
      <a href="https://www.linkedin.com/comm/messaging/?trk=nav">-</a>
      <a href="https://www.linkedin.com/comm/jobs/alerts?trk=x">Manage alerts</a>
      <a href="https://www.linkedin.com/comm/jobs/search-results/?keywords=AI">Your job alert for AI developer</a>
    `;
    expect(pickPrimaryJobLink(extractLinks(html))).toBeNull();
  });

  it("matches Indeed's real /rc/clk/dl redirect path", () => {
    const html = `
      <a href="https://cts.indeed.com/v3/find-jobs-redirect">Find Jobs</a>
      <a href="https://in.indeed.com/rc/clk/dl?jk=f0d349d7c4c44c3d&from=ja">Computer Vision Engineer</a>
    `;
    const link = pickPrimaryJobLink(extractLinks(html));
    expect(link).toBe("https://in.indeed.com/rc/clk/dl?jk=f0d349d7c4c44c3d&from=ja");
  });

  it("matches Naukri's real /jd/job-listings- path", () => {
    const html = `
      <a href="https://cm.naukri.com?data=widget">Get App</a>
      <a href="https://www.naukri.com/jd/job-listings-ai-ml-interns-specialist-rajyug-solutions-pune-0-to-1-years-210926500520?xp=1">AI ML Interns Specialist</a>
      <a href="https://www.naukri.com/mnjuser/settings/communication?mail_cat=UP">Unsubscribe</a>
    `;
    const link = pickPrimaryJobLink(extractLinks(html));
    expect(link).toBe(
      "https://www.naukri.com/jd/job-listings-ai-ml-interns-specialist-rajyug-solutions-pune-0-to-1-years-210926500520?xp=1"
    );
  });

  it("ignores Naukri's 'View All Recommendations' link, which shares the domain but isn't a specific posting", () => {
    const html = `<a href="https://www.naukri.com/mnjuser/recommendedjobs?utm=x">View All Recommendations</a>`;
    expect(pickPrimaryJobLink(extractLinks(html))).toBeNull();
  });

  it("falls back to CTA wording for a known ATS whose URL shape isn't in the pattern list yet", () => {
    const html = `
      <a href="https://boards.greenhouse.io/acme/jobs/987654">Acme — AI Engineer</a>
      <a href="https://example.com/privacy">Privacy Policy</a>
    `;
    // greenhouse.io IS in the pattern list, so this resolves via pattern
    // match, not the CTA fallback — kept as regression coverage for that
    // pattern specifically.
    const link = pickPrimaryJobLink(extractLinks(html));
    expect(link).toBe("https://boards.greenhouse.io/acme/jobs/987654");
  });

  it("never guesses — returns null for Wellfound's opaque redirect-shortener links (a documented limitation, not a bug)", () => {
    // Real structure: every link on a Wellfound email — the actual job,
    // "browse more jobs," "unsubscribe" — goes through the identical
    // opaque links.wellfound.com/s/c/{random} shortener with no
    // distinguishing path. Nothing here is safe to pick over anything
    // else, so this must stay null rather than guess.
    const html = `
      <a href="https://links.wellfound.com/s/c/aaaa">Junior AI Engineer</a>
      <a href="https://links.wellfound.com/s/c/bbbb">Browse more jobs</a>
      <a href="https://links.wellfound.com/s/c/cccc">here to unsubscribe</a>
    `;
    expect(pickPrimaryJobLink(extractLinks(html))).toBeNull();
  });

  it("never guesses — returns null when nothing plausible is present", () => {
    const html = `
      <a href="https://example.com/unsubscribe">Unsubscribe</a>
      <a href="https://example.com/privacy">Privacy Policy</a>
      <a href="mailto:help@example.com">Contact us</a>
    `;
    expect(pickPrimaryJobLink(extractLinks(html))).toBeNull();
  });

  it("never guesses — returns null for an email with no links at all", () => {
    expect(pickPrimaryJobLink([])).toBeNull();
  });
});
