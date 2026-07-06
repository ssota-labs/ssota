import { describe, expect, it, vi, beforeEach } from "vitest";

const discoverGithubSkills = vi.fn();
const importSkills = vi.fn();
const getSkillPort = vi.fn();
const getCurrentUser = vi.fn();
const resolveOrganizationIdForTeamspace = vi.fn();
const getCachedOrganizationIdForTeamspace = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getCurrentUser,
}));

vi.mock("@/lib/ports", () => ({
  getDb: () => ({}),
  getSkillPort,
  getCachedOrganizationIdForTeamspace,
  resolveOrganizationIdForTeamspace,
  registerTeamspaceOrganization: vi.fn(),
}));

const teamspaceId = "00000000-0000-4000-8000-000000000099";
const orgId = "00000000-0000-4000-8000-000000000088";

describe("POST /api/skills/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: "user-1" });
    getCachedOrganizationIdForTeamspace.mockReturnValue(orgId);
    getSkillPort.mockResolvedValue({ importSkills });
  });

  it("returns 401 when unauthenticated", async () => {
    getCurrentUser.mockResolvedValue(null);
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/skills/import", {
        method: "POST",
        body: JSON.stringify({ teamspaceId, items: [] }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 422 for invalid body", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/skills/import", {
        method: "POST",
        body: JSON.stringify({ teamspaceId }),
      }),
    );
    expect(res.status).toBe(422);
  });

  it("imports skills and returns per-item results", async () => {
    importSkills.mockResolvedValue([
      {
        ok: true,
        skillPath: "skills/foo/SKILL.md",
        skill: { id: "skill-1", key: "foo" },
      },
    ]);
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/skills/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamspaceId,
          items: [
            {
              skillPath: "skills/foo/SKILL.md",
              files: [{ path: "SKILL.md", contents: "---\nname: foo\ndescription: Foo\n---\n" }],
            },
          ],
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(importSkills).toHaveBeenCalledWith(orgId, expect.any(Array));
  });
});

describe("GET /api/skills/discover/github", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: "user-1" });
    getCachedOrganizationIdForTeamspace.mockReturnValue(orgId);
    getSkillPort.mockResolvedValue({ discoverGithubSkills });
  });

  it("returns discovered skills", async () => {
    discoverGithubSkills.mockResolvedValue({
      skills: [
        {
          skillPath: "skills/foo/SKILL.md",
          frontmatterName: "foo",
          description: "Foo",
          suggestedKey: "foo",
          displayName: "Foo",
          libraryStatus: "new",
        },
      ],
      skippedCount: 1,
    });
    const { GET } = await import("../discover/github/route");
    const url = new URL("http://localhost/api/skills/discover/github");
    url.searchParams.set("teamspaceId", teamspaceId);
    url.searchParams.set("repo", "acme/skills-pack");
    const res = await GET(new Request(url));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skills).toHaveLength(1);
    expect(body.skippedCount).toBe(1);
    expect(discoverGithubSkills).toHaveBeenCalledWith(orgId, "acme/skills-pack");
  });
});
