import { beforeEach, describe, expect, it, vi } from "vitest";

const syncSeatQuantity = vi.fn();
const countBillableSeats = vi.fn();
const isBillingEnabled = vi.fn();

vi.mock("./provider", () => ({
  isBillingEnabled,
  getBillingPort: vi.fn(async () => ({
    syncSeatQuantity,
    countBillableSeats,
  })),
}));

describe("syncOrgBillingSeats", () => {
  beforeEach(() => {
    vi.resetModules();
    syncSeatQuantity.mockReset();
    countBillableSeats.mockReset();
    isBillingEnabled.mockReset();
  });

  it("calls syncSeatQuantity when billing is enabled", async () => {
    isBillingEnabled.mockReturnValue(true);
    const { syncOrgBillingSeats } = await import("./sync-seats");

    await syncOrgBillingSeats("org-123");

    expect(syncSeatQuantity).toHaveBeenCalledOnce();
    expect(syncSeatQuantity).toHaveBeenCalledWith("org-123");
  });

  it("no-ops when billing is disabled (self-host)", async () => {
    isBillingEnabled.mockReturnValue(false);
    const { syncOrgBillingSeats } = await import("./sync-seats");

    await syncOrgBillingSeats("org-123");

    expect(syncSeatQuantity).not.toHaveBeenCalled();
  });
});
