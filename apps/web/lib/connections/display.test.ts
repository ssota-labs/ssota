import { describe, expect, it } from "vitest";
import {
  connectionDisplayLabel,
  connectionDisplaySubtitle,
  needsConnectionDisplayEnrichment,
} from "./display";

describe("connectionDisplayLabel", () => {
  it("prefers name over tenant id", () => {
    expect(
      connectionDisplayLabel({
        installationId: "inst",
        tenantId: "T123",
        name: "SSOTA Labs",
      }),
    ).toBe("SSOTA Labs");
  });
});

describe("connectionDisplaySubtitle", () => {
  const row = {
    installationId: "inst",
    tenantId: "1668922501483888642",
    name: "Tony Yohn (JooWhan) (@yohnjw)",
  };

  it("shows @handle for twitter instead of numeric user id", () => {
    expect(connectionDisplaySubtitle(row, "twitter")).toBe("@yohnjw");
  });

  it("shows tenant id for slack", () => {
    expect(
      connectionDisplaySubtitle(
        {
          installationId: "inst",
          tenantId: "T0914DV7GA0",
          name: "SSOTA Labs, Inc",
        },
        "slack",
      ),
    ).toBe("T0914DV7GA0");
  });

  it("returns null for twitter when name has no handle and tenant is numeric", () => {
    expect(
      connectionDisplaySubtitle(
        {
          installationId: "inst",
          tenantId: "1668922501483888642",
          name: "Tony Yohn",
        },
        "twitter",
      ),
    ).toBeNull();
  });

  it("returns null when name is missing", () => {
    expect(
      connectionDisplaySubtitle(
        { installationId: "inst", tenantId: "T123", name: null },
        "slack",
      ),
    ).toBeNull();
  });
});

describe("needsConnectionDisplayEnrichment", () => {
  it("is true when name is empty", () => {
    expect(
      needsConnectionDisplayEnrichment({
        installationId: "inst",
        tenantId: "T123",
        name: null,
      }),
    ).toBe(true);
  });
});
