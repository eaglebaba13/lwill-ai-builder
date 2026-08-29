import { describe, expect, it, vi } from "vitest";
import {
  handleGetGstSummary,
  type GstSummaryAuthorization,
  type GstSummaryRouteServices,
} from "../lib/crm/gst-summary-route-handlers";

function request(): Request {
  return new Request("https://builder.lwill.in/api/reports/gst-summary", {
    method: "GET",
  });
}

function createServices(authorization: GstSummaryAuthorization): GstSummaryRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    getGstSummary: vi.fn().mockResolvedValue({
      totalGstCents: 500,
      totalTaxableCents: 4500,
      invoiceCount: 3,
    }),
  };
}

describe("gst summary route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleGetGstSummary(request(), services)).status).toBe(401);
    expect(services.getGstSummary).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleGetGstSummary(request(), services)).status).toBe(403);
    expect(services.getGstSummary).not.toHaveBeenCalled();
  });
});

describe("gst summary route handlers: authorized access", () => {
  it("passes 'report.read' to authorize", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleGetGstSummary(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("report.read");
  });

  it("returns 200 with gst summary scoped to the authorized tenant", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleGetGstSummary(request(), services);
    expect(result.status).toBe(200);
    expect(services.getGstSummary).toHaveBeenCalledWith("tenant-1");
  });

  it("returns the gst summary in the response body", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleGetGstSummary(request(), services);
    expect(result.status).toBe(200);
    const body = (await result.json()) as { gstSummary: unknown };
    expect(body.gstSummary).toMatchObject({
      totalGstCents: 500,
      totalTaxableCents: 4500,
      invoiceCount: 3,
    });
  });
});
