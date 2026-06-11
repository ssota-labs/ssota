/**
 * Tenant scope for B2B2C embedders (고객사 A → 최종 고객).
 * Authority: X-SSOTA-Subject-Id header (set by embedder backend after their auth).
 * Tool args must not override this value.
 */
export function resolveSubjectId(
  request: Request,
  toolSubjectId?: string,
): string | undefined {
  const header = request.headers.get("x-ssota-subject-id")?.trim();
  const subjectId = header || toolSubjectId;

  if (header && toolSubjectId && header !== toolSubjectId) {
    throw new Error("subjectId in tool args does not match X-SSOTA-Subject-Id");
  }

  return subjectId || undefined;
}
