import { describe, expect, it, vi } from "vitest";
import {
  handleGetFranchiseOverview,
  type ReportAuthorization,
  type ReportRouteServices,
} from "../lib/crm/report-route-handlers";

function request(): Request {
  return new Request("https://builder.lwill.in/api/reports/franchise-overview", {
    method: "GET",
  });
}

function createServices(authorization: ReportAuthorization): ReportRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    getReportSummary: vi.fn().mockResolvedValue({}),
    getFranchiseOverview: vi.fn().mockResolvedValue({
      branches: [],
      sales: { invoiceCount: 0, totalRevenueCents: 0, dailyTrend: [] },
      appointments: { total: 0, statusBreakdown: [] },
      customers: { total: 0 },
      inventory: { lowStockItems: [] },
      branchPerformance: [],
    }),
    getFranchisePayout: vi.fn().mockResolvedValue({}),
    getInventoryStockReport: vi.fn().mockResolvedValue([]),
  };
}

describe("franchise overview route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleGetFranchiseOverview(request(), services)).status).toBe(401);
    expect(services.getFranchiseOverview).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleGetFranchiseOverview(request(), services)).status).toBe(403);
    expect(services.getFranchiseOverview).not.toHaveBeenCalled();
  });
});

describe("franchise overview route handlers: authorized access", () => {
  it("passes 'report.read' to authorize", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    await handleGetFranchiseOverview(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("report.read");
  });

  it("returns 200 with overview scoped to the authorized tenant", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleGetFranchiseOverview(request(), services);
    expect(result.status).toBe(200);
    expect(services.getFranchiseOverview).toHaveBeenCalledWith("tenant-1", "user-1");
  });

  it("returns the franchise overview in the response body", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleGetFranchiseOverview(request(), services);
    expect(result.status).toBe(200);
    const body = (await result.json()) as { overview: unknown };
    expect(body.overview).toMatchObject({
      branches: [],
      sales: { invoiceCount: 0, totalRevenueCents: 0, dailyTrend: [] },
      appointments: { total: 0, statusBreakdown: [] },
      customers: { total: 0 },
      inventory: { lowStockItems: [] },
      branchPerformance: [],
    });
  });
});
