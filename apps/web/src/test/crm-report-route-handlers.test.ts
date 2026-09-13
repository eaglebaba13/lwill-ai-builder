import { describe, expect, it, vi } from "vitest";
import { handleGetLeadSourceReport, handleGetSalesFunnel, handleGetConversionReport, handleGetPendingFollowups, handleGetCustomerGrowth, type CrmReportAuthorization, type CrmReportRouteServices } from "../lib/crm/crm-report-route-handlers";

function request(): Request {
  return new Request("https://builder.lwill.in/api/reports/crm/lead-source");
}

function createServices(auth: CrmReportAuthorization): CrmReportRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(auth),
    getLeadSourceReport: vi.fn().mockResolvedValue([{ source: "website", count: 5 }]),
    getSalesFunnel: vi.fn().mockResolvedValue([{ stageName: "Lead", position: 0, count: 3, valueCents: 150000 }]),
    getConversionReport: vi.fn().mockResolvedValue({ totalLeads: 10, convertedLeads: 4, conversionRate: 40 }),
    getPendingFollowups: vi.fn().mockResolvedValue([{ id: "f1", title: "Call client", dueAt: new Date() }]),
    getCustomerGrowth: vi.fn().mockResolvedValue([{ month: "2026-09", count: 5 }]),
  };
}

const authorized: CrmReportAuthorization = { outcome: "authorized", tenantId: "t1", userId: "user-1" };

describe("crm-report route handlers: auth gating", () => {
  it("returns 401 for unauthenticated", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleGetLeadSourceReport(request(), services)).status).toBe(401);
    expect((await handleGetSalesFunnel(request(), services)).status).toBe(401);
    expect((await handleGetConversionReport(request(), services)).status).toBe(401);
    expect((await handleGetPendingFollowups(request(), services)).status).toBe(401);
    expect((await handleGetCustomerGrowth(request(), services)).status).toBe(401);
  });

  it("returns 403 for forbidden", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleGetLeadSourceReport(request(), services)).status).toBe(403);
  });
});

describe("crm-report route handlers: report.read permission", () => {
  it("uses report.read for all endpoints", async () => {
    const services = createServices(authorized);
    await handleGetLeadSourceReport(request(), services);
    await handleGetSalesFunnel(request(), services);
    await handleGetConversionReport(request(), services);
    await handleGetPendingFollowups(request(), services);
    await handleGetCustomerGrowth(request(), services);
    expect(services.authorize).toHaveBeenCalledTimes(5);
    expect(services.authorize).toHaveBeenCalledWith("report.read");
  });
});

describe("crm-report route handlers: responses", () => {
  it("returns 200 with lead source data", async () => {
    const services = createServices(authorized);
    const result = await handleGetLeadSourceReport(request(), services);
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body).toEqual([{ source: "website", count: 5 }]);
  });

  it("returns 200 with sales funnel data", async () => {
    const services = createServices(authorized);
    const result = await handleGetSalesFunnel(request(), services);
    expect(result.status).toBe(200);
  });

  it("returns 200 with conversion report", async () => {
    const services = createServices(authorized);
    const result = await handleGetConversionReport(request(), services);
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.conversionRate).toBe(40);
  });

  it("returns 200 with pending followups", async () => {
    const services = createServices(authorized);
    const result = await handleGetPendingFollowups(request(), services);
    expect(result.status).toBe(200);
  });

  it("returns 200 with customer growth", async () => {
    const services = createServices(authorized);
    const result = await handleGetCustomerGrowth(request(), services);
    expect(result.status).toBe(200);
  });
});
