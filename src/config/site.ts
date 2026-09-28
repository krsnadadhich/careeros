export interface NavItem {
  id: string;
  label: string;
  href: string;
  soon?: boolean;
}

/**
 * Single source of truth for sidebar navigation — order matches the
 * approved CareerOS design prototype exactly. `soon` items render a
 * ComingSoon stub page and a muted badge in the sidebar.
 */
export const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", href: "/overview" },
  { id: "inbox", label: "Inbox", href: "/inbox" },
  { id: "jobs", label: "Jobs", href: "/jobs" },
  { id: "applications", label: "Applications", href: "/applications" },
  { id: "interviews", label: "Interviews", href: "/interviews" },
  { id: "recruiters", label: "Recruiters", href: "/recruiters" },
  { id: "skills", label: "Skills", href: "/skills" },
  { id: "analytics", label: "Analytics", href: "/analytics" },
  { id: "tasks", label: "Tasks", href: "/tasks" },
  { id: "settings", label: "Settings", href: "/settings" },
];

export const VIEW_TITLES: Record<string, string> = {
  overview: "Overview",
  inbox: "Inbox",
  jobs: "Jobs",
  applications: "Applications",
  interviews: "Interviews",
  recruiters: "Recruiters",
  skills: "Skills",
  analytics: "Analytics",
  tasks: "Tasks",
  settings: "Settings",
};

export const SITE_NAME = "CareerOS";
