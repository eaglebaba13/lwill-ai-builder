import { describe, expect, it, vi } from "vitest";
import { handleGetFranchisePayout } from "@/lib/crm/report-route-handlers";

function request(url = "https://builder.lwill.in/api/franchise/payout") {
  return new Request(url, { method: "GET" });
}

describe("franchise payout route handlers: authentication/authorization gating", () => {
  it("returns 401 when unauthenticated", async () => {
    const services = {
      authorize: vi.fn().mockResolvedValue({ outcome: "unauthenticated" }),
      getReportSummary: vi.fn(),
      getFranchiseOverview: vi.fn(),
      getFranchisePayout: vi.fn(),
      getInventoryStockReport: vi.fn(),
    } as const;

    const result = await handleGetFranchisePayout(request(), services);

    expect(result.status).toBe(401);
    expect(services.getFranchisePayout).not.toHaveBeenCalled();
  });

  it("returns 403 when forbidden", async () => {
    const services = {
      authorize: vi.fn().mockResolvedValue({ outcome: "forbidden" }),
      getReportSummary: vi.fn(),
      getFranchiseOverview: vi.fn(),
      getFranchisePayout: vi.fn(),
      getInventoryStockReport: vi.fn(),
    } as const;

    const result = await handleGetFranchisePayout(request(), services);

    expect(result.status).toBe(403);
    expect(services.getFranchisePayout).not.toHaveBeenCalled();
  });
});

describe("franchise payout route handlers: authorized access", () => {
  it("returns payout data for authorized request", async () => {
    const services = {
      authorize: vi.fn().mockResolvedValue({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" }),
      getReportSummary: vi.fn(),
      getFranchiseOverview: vi.fn(),
      getFranchisePayout: vi.fn().mockResolvedValue({
        year: 2026,
        month: 8,
        payouts: [
          {
            partnerId: "user-1",
            partnerName: "Kushwaha",
            agreementPayouts: [],
            totalRevenueSharePayoutCents: 15000,
            territoryRoyalties: [],
            totalTerritoryRoyaltyCents: 0,
            totalEligiblePayoutCents: 15000,
          },
        ],
      }),
      getInventoryStockReport: vi.fn(),
    } as const;

    const result = await handleGetFranchisePayout(request("https://builder.lwill.in/api/franchise/payout?year=2026&month=8"), services);

    expect(result.status).toBe(200);
    expect(services.getFranchisePayout).toHaveBeenCalledWith("tenant-1", "user-1", 2026, 8);
  });

  it("returns 400 for invalid month", async () => {
    const services = {
      authorize: vi.fn().mockResolvedValue({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" }),
      getReportSummary: vi.fn(),
      getFranchiseOverview: vi.fn(),
      getFranchisePayout: vi.fn(),
      getInventoryStockReport: vi.fn(),
    } as const;

    const result = await handleGetFranchisePayout(request("https://builder.lwill.in/api/franchise/payout?year=2026&month=13"), services);

    expect(result.status).toBe(400);
    expect(services.getFranchisePayout).not.toHaveBeenCalled();
  });

  it("defaults to current year and month when not provided", async () => {
    const services = {
      authorize: vi.fn().mockResolvedValue({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" }),
      getReportSummary: vi.fn(),
      getFranchiseOverview: vi.fn(),
      getFranchisePayout: vi.fn().mockResolvedValue({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        payouts: [],
      }),
      getInventoryStockReport: vi.fn(),
    } as const;

    const result = await handleGetFranchisePayout(request(), services);

    expect(result.status).toBe(200);
    expect(services.getFranchisePayout).toHaveBeenCalledWith(
      "tenant-1",
      "user-1",
      new Date().getFullYear(),
      new Date().getMonth() + 1,
    );
  });
});
