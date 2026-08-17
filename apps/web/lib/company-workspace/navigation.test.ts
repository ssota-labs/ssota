import { describe, expect, it } from "vitest";
import {
  companyWorkspacePageIdFromSlug,
  isCompanyWorkspaceRelativePath,
  isExpertWorkspaceRelativePath,
} from "./navigation";

describe("company workspace paths", () => {
  it("treats customer IA routes as company workspace", () => {
    expect(isCompanyWorkspaceRelativePath("home")).toBe(true);
    expect(isCompanyWorkspaceRelativePath("requests")).toBe(true);
    expect(isCompanyWorkspaceRelativePath("company-data")).toBe(true);
  });

  it("treats expert routes as company workspace", () => {
    expect(isCompanyWorkspaceRelativePath("expert")).toBe(true);
    expect(isCompanyWorkspaceRelativePath("expert/portfolio")).toBe(true);
    expect(isExpertWorkspaceRelativePath("expert/review-queue")).toBe(true);
  });

  it("leaves the existing console outside company workspace", () => {
    expect(isCompanyWorkspaceRelativePath("overview")).toBe(false);
    expect(isCompanyWorkspaceRelativePath("tasks")).toBe(false);
    expect(isCompanyWorkspaceRelativePath("settings/billing")).toBe(false);
    expect(isExpertWorkspaceRelativePath("home")).toBe(false);
  });

  it("maps IA slugs to page ids", () => {
    expect(companyWorkspacePageIdFromSlug("home")).toBe("home");
    expect(companyWorkspacePageIdFromSlug("expert/portfolio")).toBe("portfolio");
    expect(companyWorkspacePageIdFromSlug("overview")).toBeNull();
  });
});
