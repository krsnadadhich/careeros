/** Link extraction from raw HTML email bodies — kept separate from
 * `htmlToPlainText` (parse.ts) since that function's whole job is
 * throwing markup away; this one exists specifically to grab the one
 * piece of markup worth keeping (the real "View Job"/"Apply" link)
 * before that happens. Regex-based, not a full HTML parser — same "not
 * a full sanitizer, doesn't need to be" precedent `htmlToPlainText`
 * already sets; a real parser (jsdom) is only a devDependency here, for
 * the test environment, not something runtime code should pull in. */

export interface ExtractedLink {
  text: string;
  href: string;
}

const ANCHOR_RE = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTagsAndDecode(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

/** Every `<a href>` in the raw HTML, with its (tag-stripped) inner text.
 * `href` is entity-decoded too — HTML attribute values legitimately
 * encode `&` as `&amp;` (every real sample seen has this), and a stored
 * URL with a literal "&amp;" instead of "&" is broken outside a browser
 * lenient enough to fix it up when rendering an anchor. */
export function extractLinks(html: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  for (const match of html.matchAll(ANCHOR_RE)) {
    const href = decodeEntities(match[1].trim());
    const text = stripTagsAndDecode(match[2]);
    if (href) links.push({ text, href });
  }
  return links;
}

const BLOCKLIST_RE = /unsubscribe|preferences|opt-out|optout|privacy|mailto:/i;

// Real anchor text on a genuine job-view link is unreliable — verified
// against real synced emails, LinkedIn puts the job title there (not
// "View Job"), and some platforms wrap the link around a logo image with
// no text at all. CTA wording is kept only as a last-resort fallback for
// templates that don't match a known URL shape below.
const CTA_TEXT_RE = /view job|apply now|see job|job details|view position|view opening|see details|apply here/i;

// Chrome/utility paths that share a job board's domain but are never a
// specific posting — verified against real LinkedIn/Naukri emails, which
// both put these right next to the real job links.
const NON_JOB_PATH_RE =
  /\/(feed|messaging|mynetwork|notifications)\/|jobs\/(search-results|alerts)\b|mnjuser\/recommendedjobs|recommendedjobs/i;

// Path shapes confirmed against real synced job-alert emails (see the
// commit that added this file for how they were found) — matched as
// substrings/regexes, not full URL parses, same "not a full parser"
// precedent as the rest of this module. Ordered by how much of the
// account's real volume they cover.
const JOB_VIEW_PATTERNS: RegExp[] = [
  /linkedin\.com\/(comm\/)?jobs\/view\//i, // real: linkedin.com/comm/jobs/view/{id}/
  /indeed\.com\/rc\/clk/i, // real: in.indeed.com/rc/clk/dl?jk={id}
  /naukri\.com\/jd\/job-listings/i, // real: naukri.com/jd/job-listings-{slug}
  // Not yet confirmed against a real sample in this account, but these
  // ATS platforms don't obfuscate their own job URLs the way LinkedIn's
  // tracking wrapper or Wellfound's redirect shortener do, so the shape
  // is stable and safe to match directly.
  /greenhouse\.io\/.+\/jobs\//i,
  /jobs\.lever\.co\//i,
  /\.workable\.com\/.+\/j\//i,
  /myworkdayjobs\.com\/.+\/job\//i,
];

function isPlausibleCandidate(link: ExtractedLink): boolean {
  return (
    /^https?:\/\//i.test(link.href) &&
    !BLOCKLIST_RE.test(link.href) &&
    !BLOCKLIST_RE.test(link.text) &&
    !NON_JOB_PATH_RE.test(link.href)
  );
}

/** Picks the one link most likely to be the actual job posting, or
 * `null` when nothing plausible is found — never guesses a link that
 * might be wrong, matching this codebase's "never invent" discipline
 * extended to URLs (a wrong link is worse than a missing one).
 *
 * Deliberately does NOT attempt a generic-domain fallback for platforms
 * whose links don't match a known pattern (e.g. Wellfound wraps every
 * link — the real job, "browse more jobs," "unsubscribe" — through the
 * same opaque `links.wellfound.com/s/c/{random}` redirect shortener with
 * no distinguishing path; there is nothing reliable to match there, so
 * those honestly return null rather than risk picking the wrong one). */
export function pickPrimaryJobLink(links: ExtractedLink[]): string | null {
  const candidates = links.filter(isPlausibleCandidate);

  const byPattern = candidates.find((l) => JOB_VIEW_PATTERNS.some((re) => re.test(l.href)));
  if (byPattern) return byPattern.href;

  const byCtaText = candidates.find((l) => CTA_TEXT_RE.test(l.text));
  if (byCtaText) return byCtaText.href;

  return null;
}
