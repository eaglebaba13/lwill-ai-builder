import { describe, expect, it, vi } from "vitest";
import {
  handleListAppointmentReport,
  type AppointmentReportAuthorization,
  type AppointmentReportRouteServices,
} from "../lib/crm/appointment-report-route-handlers";

function request(): Request {
  return new Request("https://builder.lwill.in/api/reports/appointments", {
    method: "GET",
  });
}

function createServices(authorization: AppointmentReportAuthorization): AppointmentReportRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listAppointmentReport: vi.fn().mockResolvedValue([
      { date: "2026-08-01", appointmentCount: 2, statusBreakdown: [{ status: "Booked", count: 2 }] },
    ]),
  };
}

describe("appointment report route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListAppointmentReport(request(), services)).status).toBe(401);
    expect(services.listAppointmentReport).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListAppointmentReport(request(), services)).status).toBe(403);
    expect(services.listAppointmentReport).not.toHaveBeenCalled();
  });
});

describe("appointment report route handlers: authorized access", () => {
  it("passes 'report.read' to authorize", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListAppointmentReport(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("report.read");
  });

  it("returns 200 with appointment report scoped to the authorized tenant", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleListAppointmentReport(request(), services);
    expect(result.status).toBe(200);
    expect(services.listAppointmentReport).toHaveBeenCalledWith("tenant-1");
  });

  it("returns the appointment report in the response body", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleListAppointmentReport(request(), services);
    expect(result.status).toBe(200);
    const body = (await result.json()) as { appointmentReport: unknown };
    expect(body.appointmentReport).toMatchObject([
      { date: "2026-08-01", appointmentCount: 2, statusBreakdown: [{ status: "Booked", count: 2 }] },
    ]);
  });
});
