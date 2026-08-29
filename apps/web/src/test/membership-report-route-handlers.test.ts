import { describe, expect, it, vi } from "vitest";
import {
  handleListMembershipReport,
  type MembershipReportAuthorization,
  type MembershipReportRouteServices,
} from "../lib/crm/membership-report-route-handlers";

function request(): Request {
  return new Request("https://builder.lwill.in/api/reports/memberships", {
    method: "GET",
  });
}

function createServices(authorization: MembershipReportAuthorization): MembershipReportRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listMembershipReport: vi.fn().mockResolvedValue([
      { status: "Active", count: 3, packageBreakdown: [{ packageId: "pkg-1", packageName: "Basic", count: 3 }] },
    ]),
  };
}

describe("membership report route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListMembershipReport(request(), services)).status).toBe(401);
    expect(services.listMembershipReport).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListMembershipReport(request(), services)).status).toBe(403);
    expect(services.listMembershipReport).not.toHaveBeenCalled();
  });
});

describe("membership report route handlers: authorized access", () => {
  it("passes 'report.read' to authorize", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListMembershipReport(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("report.read");
  });

  it("returns 200 with membership report scoped to the authorized tenant", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleListMembershipReport(request(), services);
    expect(result.status).toBe(200);
    expect(services.listMembershipReport).toHaveBeenCalledWith("tenant-1");
  });

  it("returns the membership report in the response body", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleListMembershipReport(request(), services);
    expect(result.status).toBe(200);
    const body = (await result.json()) as { membershipReport: unknown };
    expect(body.membershipReport).toMatchObject([
      { status: "Active", count: 3, packageBreakdown: [{ packageId: "pkg-1", packageName: "Basic", count: 3 }] },
    ]);
  });
});
