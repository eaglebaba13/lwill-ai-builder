import { describe, expect, it, vi } from "vitest";
import {
  handleListPackageUtilizationReport,
  type PackageUtilizationReportAuthorization,
  type PackageUtilizationReportRouteServices,
} from "../lib/crm/package-utilization-report-route-handlers";

function request(): Request {
  return new Request("https://builder.lwill.in/api/reports/package-utilization", {
    method: "GET",
  });
}

function createServices(authorization: PackageUtilizationReportAuthorization): PackageUtilizationReportRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listPackageUtilizationReport: vi.fn().mockResolvedValue([
      { packageId: "pkg-1", packageName: "Basic", totalMemberships: 5, activeMemberships: 3 },
    ]),
  };
}

describe("package utilization report route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListPackageUtilizationReport(request(), services)).status).toBe(401);
    expect(services.listPackageUtilizationReport).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListPackageUtilizationReport(request(), services)).status).toBe(403);
    expect(services.listPackageUtilizationReport).not.toHaveBeenCalled();
  });
});

describe("package utilization report route handlers: authorized access", () => {
  it("passes 'report.read' to authorize", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListPackageUtilizationReport(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("report.read");
  });

  it("returns 200 with package utilization report scoped to the authorized tenant", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleListPackageUtilizationReport(request(), services);
    expect(result.status).toBe(200);
    expect(services.listPackageUtilizationReport).toHaveBeenCalledWith("tenant-1");
  });

  it("returns the package utilization report in the response body", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleListPackageUtilizationReport(request(), services);
    expect(result.status).toBe(200);
    const body = (await result.json()) as { packageUtilizationReport: unknown };
    expect(body.packageUtilizationReport).toMatchObject([
      { packageId: "pkg-1", packageName: "Basic", totalMemberships: 5, activeMemberships: 3 },
    ]);
  });
});
