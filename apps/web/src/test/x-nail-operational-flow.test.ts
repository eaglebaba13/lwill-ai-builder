import { describe, expect, it } from "vitest";
import {
  authenticateOperationalUser,
  createCustomerRecord,
  createInvoiceRecord,
  createServiceRecord,
  createStaffRecord,
  createAppointmentRecord,
  transitionAppointmentStatus,
  ensureOperationalAccess,
  OperationalAccessError,
} from "../lib/x-nail/operational-workflow";

describe("X Nail operational launch workflow", () => {
  it("rejects unauthenticated access", () => {
    expect(() =>
      ensureOperationalAccess({
        authenticated: false,
        tenantId: "tenant-xnail",
      }),
    ).toThrow(OperationalAccessError);
  });

  it("rejects cross-tenant access", () => {
    expect(() =>
      ensureOperationalAccess({
        authenticated: true,
        tenantId: "tenant-2",
        activeTenantId: "tenant-xnail",
      }),
    ).toThrow(OperationalAccessError);
  });

  it("authenticates a valid X Nail user and preserves tenant membership", () => {
    const session = authenticateOperationalUser({
      email: "owner@x-nail.local",
      password: "Xnail2024!",
      tenantId: "tenant-xnail",
    });

    expect(session.authenticated).toBe(true);
    expect(session.tenantId).toBe("tenant-xnail");
  });

  it("creates a customer within the tenant", () => {
    const customer = createCustomerRecord({
      tenantId: "tenant-xnail",
      name: "Priya Sharma",
      phone: "9876543210",
      email: "priya@example.com",
    });

    expect(customer.tenantId).toBe("tenant-xnail");
    expect(customer.name).toBe("Priya Sharma");
  });

  it("creates a service within the tenant", () => {
    const service = createServiceRecord({
      tenantId: "tenant-xnail",
      name: "Classic Manicure",
      durationMinutes: 45,
      priceCents: 1500,
      isActive: true,
    });

    expect(service.tenantId).toBe("tenant-xnail");
    expect(service.priceCents).toBe(1500);
  });

  it("creates a staff record within the tenant", () => {
    const staff = createStaffRecord({
      tenantId: "tenant-xnail",
      displayName: "Mina Patel",
      branchId: "branch-main",
      isActive: true,
    });

    expect(staff.tenantId).toBe("tenant-xnail");
    expect(staff.branchId).toBe("branch-main");
  });

  it("creates an appointment with a valid status", () => {
    const appointment = createAppointmentRecord({
      tenantId: "tenant-xnail",
      customerId: "cust-1",
      serviceId: "svc-1",
      staffId: "staff-1",
      startsAt: "2026-08-12T10:30:00.000Z",
      endsAt: "2026-08-12T11:15:00.000Z",
      status: "Booked",
    });

    expect(appointment.tenantId).toBe("tenant-xnail");
    expect(appointment.status).toBe("Booked");
  });

  it("transitions appointment status according to the salon flow", () => {
    const booked = createAppointmentRecord({
      tenantId: "tenant-xnail",
      customerId: "cust-1",
      serviceId: "svc-1",
      staffId: "staff-1",
      startsAt: "2026-08-12T10:30:00.000Z",
      endsAt: "2026-08-12T11:15:00.000Z",
      status: "Booked",
    });

    const confirmed = transitionAppointmentStatus(booked, "Confirmed");
    const arrived = transitionAppointmentStatus(confirmed, "Arrived");
    const inService = transitionAppointmentStatus(arrived, "In Service");
    const completed = transitionAppointmentStatus(inService, "Completed");

    expect(completed.status).toBe("Completed");
  });

  it("creates an invoice with subtotal, gst, and total", () => {
    const invoice = createInvoiceRecord({
      tenantId: "tenant-xnail",
      customerId: "cust-1",
      items: [
        {
          description: "Classic Manicure",
          quantity: 1,
          unitPriceCents: 1500,
        },
        {
          description: "Nail Art Add-on",
          quantity: 2,
          unitPriceCents: 800,
        },
      ],
      discountCents: 200,
      gstCents: 180,
    });

    expect(invoice.subtotalCents).toBe(3100);
    expect(invoice.discountCents).toBe(200);
    expect(invoice.gstCents).toBe(180);
    expect(invoice.totalCents).toBe(3080);
  });

  it("rejects cross-tenant customer and invoice operations", () => {
    expect(() =>
      createCustomerRecord({
        tenantId: "tenant-2",
        name: "Other Tenant Customer",
      }),
    ).toThrow(OperationalAccessError);

    expect(() =>
      createInvoiceRecord({
        tenantId: "tenant-2",
        customerId: "cust-1",
        items: [{ description: "Service", quantity: 1, unitPriceCents: 1000 }],
      }),
    ).toThrow(OperationalAccessError);
  });
});
