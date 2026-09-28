import { cn } from "@/lib/utils";
import { matchColor } from "@/lib/utils/match-color";

const COLOR_CLASS: Record<ReturnType<typeof matchColor>, string> = {
  brand: "text-brand",
  foreground: "text-foreground",
  text2: "text-text2",
};

export interface MatchScoreBreakdown {
  skillsScore: number;
  experienceScore: number;
  roleScore: number;
  locationScore: number;
}

export function MatchBadge({
  score,
  className,
  breakdown,
}: {
  score: number;
  className?: string;
  /** When provided, the badge gets a hover tooltip (native `title`, no new
   * dependency) showing the sub-scores behind the overall number — lets
   * list views explain a match without navigating to job detail. Omitted
   * entirely, the badge renders exactly as before. */
  breakdown?: MatchScoreBreakdown;
}) {
  const title = breakdown
    ? `Skills ${breakdown.skillsScore}% · Experience ${breakdown.experienceScore}% · Role ${breakdown.roleScore}% · Location ${breakdown.locationScore}%`
    : undefined;

  return (
    <span
      className={cn("font-mono font-bold", COLOR_CLASS[matchColor(score)], className, breakdown && "cursor-help")}
      title={title}
    >
      {score}%
    </span>
  );
}
