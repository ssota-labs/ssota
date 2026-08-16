export const COMPANY_WORKSPACE_ROUTE_SEGMENTS = [
  "home",
  "requests",
  "engagements",
  "reports",
  "documents",
  "company-data",
  "expert",
] as const;

export type CompanyWorkspacePersona = "customer" | "expert";

export type CompanyWorkspacePageId =
  | "home"
  | "requests"
  | "engagements"
  | "reports"
  | "documents"
  | "company-data"
  | "portfolio"
  | "review-queue"
  | "workspace";

export type CompanyWorkspaceNavItem = {
  id: CompanyWorkspacePageId;
  href: string;
  labelKey: string;
  icon: CompanyWorkspaceNavIcon;
};

export type CompanyWorkspaceNavIcon =
  | "house"
  | "tray"
  | "handshake"
  | "chart"
  | "files"
  | "database"
  | "briefcase"
  | "queue"
  | "kanban";

export const CUSTOMER_NAV: CompanyWorkspaceNavItem[] = [
  { id: "home", href: "home", labelKey: "nav.home", icon: "house" },
  { id: "requests", href: "requests", labelKey: "nav.requests", icon: "tray" },
  {
    id: "engagements",
    href: "engagements",
    labelKey: "nav.engagements",
    icon: "handshake",
  },
  { id: "reports", href: "reports", labelKey: "nav.reports", icon: "chart" },
  {
    id: "documents",
    href: "documents",
    labelKey: "nav.documents",
    icon: "files",
  },
  {
    id: "company-data",
    href: "company-data",
    labelKey: "nav.companyData",
    icon: "database",
  },
];

export const EXPERT_NAV: CompanyWorkspaceNavItem[] = [
  {
    id: "portfolio",
    href: "expert/portfolio",
    labelKey: "nav.clientPortfolio",
    icon: "briefcase",
  },
  {
    id: "review-queue",
    href: "expert/review-queue",
    labelKey: "nav.reviewQueue",
    icon: "queue",
  },
  {
    id: "workspace",
    href: "expert/workspace",
    labelKey: "nav.engagementWorkspace",
    icon: "kanban",
  },
];

export const COMPANY_WORKSPACE_PAGE_SLUGS: Record<string, CompanyWorkspacePageId> = {
  home: "home",
  requests: "requests",
  engagements: "engagements",
  reports: "reports",
  documents: "documents",
  "company-data": "company-data",
  "expert/portfolio": "portfolio",
  "expert/review-queue": "review-queue",
  "expert/workspace": "workspace",
};

export function companyWorkspacePageIdFromSlug(
  slug: string,
): CompanyWorkspacePageId | null {
  return COMPANY_WORKSPACE_PAGE_SLUGS[slug] ?? null;
}

export function isCompanyWorkspaceRelativePath(relativePath: string): boolean {
  const first = relativePath.split("/")[0] ?? "";
  return (COMPANY_WORKSPACE_ROUTE_SEGMENTS as readonly string[]).includes(first);
}

export function isExpertWorkspaceRelativePath(relativePath: string): boolean {
  return relativePath === "expert" || relativePath.startsWith("expert/");
}

export function navForPersona(
  persona: CompanyWorkspacePersona,
): CompanyWorkspaceNavItem[] {
  return persona === "expert" ? EXPERT_NAV : CUSTOMER_NAV;
}
