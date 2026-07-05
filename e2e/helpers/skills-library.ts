import type { Page } from "@playwright/test";
import { getDefaultProjectId } from "./mcp";

const COMMUNITY_EXPLORE_KEYS = ["web-design-guidelines", "frontend-design"];

/** Ensures seeded community catalog skills are not stuck in the org library between tests. */
export async function resetCommunityExploreSkills(page: Page): Promise<void> {
  const teamspaceId = await getDefaultProjectId();
  const libRes = await page.request.get(
    `/api/skills/library?teamspaceId=${teamspaceId}`,
  );
  if (!libRes.ok()) return;

  const data = (await libRes.json()) as {
    skills?: Array<{ id: string; key: string }>;
  };

  for (const skill of data.skills ?? []) {
    const isCommunityExplore = COMMUNITY_EXPLORE_KEYS.includes(skill.key);
    const isE2eCustom = skill.key.startsWith("e2e-custom-skill-");
    if (!isCommunityExplore && !isE2eCustom) continue;
    await page.request.delete(`/api/skills/library/${skill.id}`, {
      data: { teamspaceId },
    });
  }
}
