import { afterEach, describe, expect, it } from "vitest";
import {
  companyWorkspacePageIdFromSlug,
  isCompanyWorkspaceEnabled,
  isCompanyWorkspaceRelativePath,
  isExpertWorkspaceRelativePath,
} from "./navigation";

const FLAG = "NEXT_PUBLIC_COMPANY_WORKSPACE_ENABLED";
const saved = process.env[FLAG];
afterEach(() => {
  if (saved === undefined) delete process.env[FLAG];
  else process.env[FLAG] = saved;
});

describe("company workspace paths — 플래그 꺼짐 (기본)", () => {
  it("기본은 꺼져 있고 어떤 경로도 company workspace가 아니다", () => {
    delete process.env[FLAG];
    expect(isCompanyWorkspaceEnabled()).toBe(false);
    expect(isCompanyWorkspaceRelativePath("home")).toBe(false);
    expect(isCompanyWorkspaceRelativePath("requests")).toBe(false);
    expect(isCompanyWorkspaceRelativePath("expert/portfolio")).toBe(false);
  });
});

describe("company workspace paths — 플래그 켜짐", () => {
  it("treats customer IA routes as company workspace", () => {
    process.env[FLAG] = "1";
    expect(isCompanyWorkspaceRelativePath("home")).toBe(true);
    expect(isCompanyWorkspaceRelativePath("requests")).toBe(true);
    expect(isCompanyWorkspaceRelativePath("company-data")).toBe(true);
  });

  it("treats expert routes as company workspace", () => {
    process.env[FLAG] = "true";
    expect(isCompanyWorkspaceRelativePath("expert")).toBe(true);
    expect(isCompanyWorkspaceRelativePath("expert/portfolio")).toBe(true);
    expect(isExpertWorkspaceRelativePath("expert/review-queue")).toBe(true);
  });

  it("leaves the existing console outside company workspace", () => {
    process.env[FLAG] = "1";
    expect(isCompanyWorkspaceRelativePath("overview")).toBe(false);
    expect(isCompanyWorkspaceRelativePath("tasks")).toBe(false);
    expect(isCompanyWorkspaceRelativePath("settings/billing")).toBe(false);
    expect(isExpertWorkspaceRelativePath("home")).toBe(false);
  });
});

describe("company workspace slugs", () => {
  it("maps IA slugs to page ids (플래그 무관)", () => {
    expect(companyWorkspacePageIdFromSlug("home")).toBe("home");
    expect(companyWorkspacePageIdFromSlug("expert/portfolio")).toBe("portfolio");
    expect(companyWorkspacePageIdFromSlug("overview")).toBeNull();
  });
});
