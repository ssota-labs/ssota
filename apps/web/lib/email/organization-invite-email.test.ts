import { describe, expect, it } from "vitest";
import { buildOrganizationInviteEmailHtml } from "./organization-invite-email";

describe("buildOrganizationInviteEmailHtml", () => {
  it("includes org name, logo URL, and invite link", () => {
    const html = buildOrganizationInviteEmailHtml({
      invitationId: "11111111-1111-1111-1111-111111111111",
      inviteeEmail: "user@example.com",
      organizationName: "SSOTA Labs",
      inviterName: "Smoke User",
      expiresAt: new Date("2026-07-01T00:00:00.000Z"),
      locale: "en",
    });

    expect(html).toContain("SSOTA Labs");
    expect(html).toContain("Smoke User");
    expect(html).toContain("/landing/logo.png");
    expect(html).toContain("/invite/11111111-1111-1111-1111-111111111111");
    expect(html).toContain("Accept invitation");
  });
});
