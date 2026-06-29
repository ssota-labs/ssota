export type DocStatus = "draft" | "review" | "approved" | "active" | "archived";

export const DOC_STATUS_OPTIONS: DocStatus[] = [
  "draft",
  "review",
  "approved",
  "active",
  "archived",
];

export const DOC_STATUS_LABELS: Record<DocStatus, string> = {
  draft: "Draft",
  review: "Review",
  approved: "Approved",
  active: "Active",
  archived: "Archived",
};

export function parseDocStatus(value: unknown): DocStatus | undefined {
  if (typeof value !== "string") return undefined;
  return DOC_STATUS_OPTIONS.includes(value as DocStatus)
    ? (value as DocStatus)
    : undefined;
}
