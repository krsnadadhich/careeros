export const FOLLOW_UP_THRESHOLD_DAYS = 7;

/** Pure — a recruiter needs follow-up once it's been longer than the
 * threshold since the last inbound contact (or since we first recorded
 * them, if we've never heard from them again), OR their most recent
 * linked email needs a reply right now regardless of how recently that
 * was (`latestEmailNeedsReply` — the caller computes this from
 * `Email.actionRequired` since it depends on the caller's own recruiter
 * shape, not something this function can look up itself). No DB access,
 * unit-tested directly against fixed dates. */
export function needsFollowUp(
  recruiter: { lastContactedAt: Date | null; createdAt: Date },
  now: Date = new Date(),
  thresholdDays: number = FOLLOW_UP_THRESHOLD_DAYS,
  latestEmailNeedsReply: boolean = false
): boolean {
  const since = recruiter.lastContactedAt ?? recruiter.createdAt;
  const daysSince = (now.getTime() - since.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= thresholdDays || latestEmailNeedsReply;
}
