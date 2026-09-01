import { describe, expect, it, vi } from "vitest";
import {
  handleGetReportSummary,
  type ReportAuthorization,
  type ReportRouteServices,
} from "../lib/crm/report-route-handlers";

function request(): Request {
  return new Request("https://builder.lwill.in/api/reports", {
    method: "GET",
  });
}

function createServices(authorization: ReportAuthorization): ReportRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    getReportSummary: vi.fn().mockResolvedValue({
      sales: { invoiceCount: 2, totalRevenueCents: 3500 },
      appointments: { total: 3, statusBreakdown: [{ status: "Booked", count: 3 }] },
      customers: { total: 5 },
      inventory: { stockItemCount: 10, totalQuantity: 50, movementCount: 8 },
    }),
    getFranchiseOverview: vi.fn().mockResolvedValue({}),
    getFranchisePayout: vi.fn().mockResolvedValue({}),
    getInventoryStockReport: vi.fn().mockResolvedValue([]),
  };
}

describe("report route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleGetReportSummary(request(), services)).status).toBe(401);
    expect(services.getReportSummary).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleGetReportSummary(request(), services)).status).toBe(403);
    expect(services.getReportSummary).not.toHaveBeenCalled();
  });
});

describe("report route handlers: authorized access", () => {
  it("passes 'report.read' to authorize", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    await handleGetReportSummary(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("report.read");
  });

  it("returns 200 with summary scoped to the authorized tenant", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleGetReportSummary(request(), services);
    expect(result.status).toBe(200);
    expect(services.getReportSummary).toHaveBeenCalledWith("tenant-1");
  });

  it("returns the report summary in the response body", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleGetReportSummary(request(), services);
    expect(result.status).toBe(200);
    const body = (await result.json()) as { report: unknown };
    expect(body.report).toMatchObject({
      sales: { invoiceCount: 2, totalRevenueCents: 3500 },
      appointments: { total: 3 },
      customers: { total: 5 },
      inventory: { stockItemCount: 10, totalQuantity: 50, movementCount: 8 },
    });
  });
});
