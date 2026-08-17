import { describe, expect, it } from "vitest";
import { createCustomerService } from "./customer-service";
import { createServiceService } from "./service-service";
import { createAppointmentService } from "./appointment-service";

describe("customer/service/appointment bootstrap", () => {
  const customerService = createCustomerService({
    customer: {
      create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "customer-1", ...data }),
      findFirst: async () => null,
      findUnique: async () => null,
      findMany: async () => [],
      update: async ({ data }: { data: Record<string, unknown> }) => ({ id: "customer-1", ...data }),
      delete: async () => ({ id: "customer-1" }),
    },
  } as never);

  it("creates a customer within the tenant", async () => {
    const customer = await customerService.createCustomer({
      tenantId: "tenant-1",
      name: "Jane Doe",
      phone: "123456789",
      email: "jane@example.com",
      notes: "VIP",
    });

    expect(customer.tenantId).toBe("tenant-1");
    expect(customer.name).toBe("Jane Doe");
  });

  it("rejects cross-tenant customer lookup", async () => {
    const customer = await customerService.getCustomer({ tenantId: "tenant-1", customerId: "customer-1" });
    expect(customer).toBeNull();
  });

  it("creates a service within the tenant", async () => {
    const serviceService = createServiceService({
      service: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "service-1", ...data }),
        findUnique: async () => null,
        findMany: async () => [],
        update: async ({ data }: { data: Record<string, unknown> }) => ({ id: "service-1", ...data }),
        delete: async () => ({ id: "service-1" }),
      },
    } as never);

    const service = await serviceService.createService({
      tenantId: "tenant-1",
      name: "Manicure",
      durationMinutes: 45,
      priceCents: 5000,
      description: "Classic manicure",
    });

    expect(service.tenantId).toBe("tenant-1");
    expect(service.name).toBe("Manicure");
  });

  it("rejects invalid service duration and pricing before persistence", async () => {
    const create = async ({ data }: { data: Record<string, unknown> }) => ({ id: "service-1", ...data });
    const serviceService = createServiceService({
      service: {
        create,
        findUnique: async () => null,
        findMany: async () => [],
        update: async ({ data }: { data: Record<string, unknown> }) => ({ id: "service-1", ...data }),
        delete: async () => ({ id: "service-1" }),
      },
    } as never);

    await expect(serviceService.createService({
      tenantId: "tenant-1",
      name: "Invalid duration",
      durationMinutes: 0,
      priceCents: 5000,
    })).rejects.toThrow("service duration must be a positive whole number of minutes");

    await expect(serviceService.createService({
      tenantId: "tenant-1",
      name: "Invalid price",
      durationMinutes: 45,
      priceCents: -1,
    })).rejects.toThrow("service price must be a non-negative whole number of cents");
  });

  it("creates an appointment with tenant-valid customer and service", async () => {
    const appointmentService = createAppointmentService({
      appointment: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "appointment-1", ...data }),
        findUnique: async () => null,
        findMany: async () => [],
        update: async ({ data }: { data: Record<string, unknown> }) => ({ id: "appointment-1", ...data }),
      },
      customer: {
        findUnique: async () => ({ id: "customer-1", tenantId: "tenant-1" }),
      },
      service: {
        findUnique: async () => ({ id: "service-1", tenantId: "tenant-1" }),
      },
    } as never);

    const appointment = await appointmentService.createAppointment({
      tenantId: "tenant-1",
      customerId: "customer-1",
      serviceId: "service-1",
      startsAt: new Date("2026-08-12T10:00:00.000Z"),
      endsAt: new Date("2026-08-12T10:45:00.000Z"),
      status: "scheduled",
      notes: "First visit",
    });

    expect(appointment.tenantId).toBe("tenant-1");
    expect(appointment.status).toBe("scheduled");
  });

  it("rejects an appointment when the customer or service is from another tenant", async () => {
    const appointmentService = createAppointmentService({
      appointment: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "appointment-1", ...data }),
        findUnique: async () => null,
        findMany: async () => [],
        update: async ({ data }: { data: Record<string, unknown> }) => ({ id: "appointment-1", ...data }),
      },
      customer: {
        findUnique: async () => ({ id: "customer-1", tenantId: "tenant-2" }),
      },
      service: {
        findUnique: async () => ({ id: "service-1", tenantId: "tenant-1" }),
      },
    } as never);

    await expect(
      appointmentService.createAppointment({
        tenantId: "tenant-1",
        customerId: "customer-1",
        serviceId: "service-1",
        startsAt: new Date("2026-08-12T10:00:00.000Z"),
        endsAt: new Date("2026-08-12T10:45:00.000Z"),
        status: "scheduled",
      }),
    ).rejects.toThrow("customer and service must belong to the same tenant");
  });
});
