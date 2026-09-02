import { describe, expect, it, vi } from "vitest";
import { createAppointmentService } from "./appointment-service";

function createFixture() {
  type AppointmentState = {
    id: string;
    tenantId: string;
    customerId: string;
    serviceId: string;
    branchId: string | null;
    startsAt: Date;
    endsAt: Date;
    status: string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  const state = {
    appointments: new Map<string, AppointmentState>(),
    customers: new Map<string, { id: string; tenantId: string }>(),
    services: new Map<string, { id: string; tenantId: string }>(),
    branches: new Map<string, { id: string; tenantId: string }>(),
  };
  let nextId = 1;
  const prisma = {
    appointment: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = `appt-${nextId++}`;
        const record = { id, createdAt: new Date(), updatedAt: new Date(), ...data } as AppointmentState;
        state.appointments.set(record.id, record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        state.appointments.get(where.id) ?? null,
      ),
      findMany: vi.fn(async ({ where, orderBy }: { where?: { tenantId?: string }; orderBy?: { startsAt?: string } }) => {
        let results = [...state.appointments.values()].filter(
          (a) => where?.tenantId === undefined || a.tenantId === where.tenantId,
        );
        if (orderBy?.startsAt === "desc") {
          results.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
        }
        return results;
      }),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const existing = state.appointments.get(where.id);
          const updated = { ...existing, ...data } as AppointmentState;
          state.appointments.set(where.id, updated);
          return updated;
        },
      ),
    },
    customer: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        state.customers.get(where.id) ?? null,
      ),
    },
    service: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        state.services.get(where.id) ?? null,
      ),
    },
    branch: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        state.branches.get(where.id) ?? null,
      ),
    },
  };
  return { prisma, state };
}

describe("appointment service", () => {
  // --- createAppointment ---

  it("creates an appointment with valid same-tenant customer and service", async () => {
    const { prisma, state } = createFixture();
    state.customers.set("cust-1", { id: "cust-1", tenantId: "tenant-1" });
    state.services.set("svc-1", { id: "svc-1", tenantId: "tenant-1" });
    const service = createAppointmentService(prisma as never);

    const result = await service.createAppointment({
      tenantId: "tenant-1",
      customerId: "cust-1",
      serviceId: "svc-1",
      startsAt: new Date("2026-09-01T10:00:00.000Z"),
      endsAt: new Date("2026-09-01T11:00:00.000Z"),
      status: "confirmed",
      notes: "First visit",
    });

    expect(result.tenantId).toBe("tenant-1");
    expect(result.customerId).toBe("cust-1");
    expect(result.serviceId).toBe("svc-1");
    expect(result.status).toBe("confirmed");
    expect(result.notes).toBe("First visit");
  });

  it("rejects createAppointment with cross-tenant customer", async () => {
    const { prisma, state } = createFixture();
    state.customers.set("cust-1", { id: "cust-1", tenantId: "tenant-2" });
    state.services.set("svc-1", { id: "svc-1", tenantId: "tenant-1" });
    const service = createAppointmentService(prisma as never);

    await expect(
      service.createAppointment({
        tenantId: "tenant-1",
        customerId: "cust-1",
        serviceId: "svc-1",
        startsAt: new Date("2026-09-01T10:00:00.000Z"),
        endsAt: new Date("2026-09-01T11:00:00.000Z"),
        status: "confirmed",
      }),
    ).rejects.toThrow("customer and service must belong to the same tenant");
  });

  it("rejects createAppointment with cross-tenant service", async () => {
    const { prisma, state } = createFixture();
    state.customers.set("cust-1", { id: "cust-1", tenantId: "tenant-1" });
    state.services.set("svc-1", { id: "svc-1", tenantId: "tenant-2" });
    const service = createAppointmentService(prisma as never);

    await expect(
      service.createAppointment({
        tenantId: "tenant-1",
        customerId: "cust-1",
        serviceId: "svc-1",
        startsAt: new Date("2026-09-01T10:00:00.000Z"),
        endsAt: new Date("2026-09-01T11:00:00.000Z"),
        status: "confirmed",
      }),
    ).rejects.toThrow("customer and service must belong to the same tenant");
  });

  it("rejects createAppointment with nonexistent customer", async () => {
    const { prisma, state } = createFixture();
    state.services.set("svc-1", { id: "svc-1", tenantId: "tenant-1" });
    const service = createAppointmentService(prisma as never);

    await expect(
      service.createAppointment({
        tenantId: "tenant-1",
        customerId: "missing-cust",
        serviceId: "svc-1",
        startsAt: new Date("2026-09-01T10:00:00.000Z"),
        endsAt: new Date("2026-09-01T11:00:00.000Z"),
        status: "confirmed",
      }),
    ).rejects.toThrow("customer and service must belong to the same tenant");
  });

  it("rejects createAppointment with nonexistent service", async () => {
    const { prisma, state } = createFixture();
    state.customers.set("cust-1", { id: "cust-1", tenantId: "tenant-1" });
    const service = createAppointmentService(prisma as never);

    await expect(
      service.createAppointment({
        tenantId: "tenant-1",
        customerId: "cust-1",
        serviceId: "missing-svc",
        startsAt: new Date("2026-09-01T10:00:00.000Z"),
        endsAt: new Date("2026-09-01T11:00:00.000Z"),
        status: "confirmed",
      }),
    ).rejects.toThrow("customer and service must belong to the same tenant");
  });

  // --- getAppointment ---

  it("returns the correct tenant appointment via getAppointment", async () => {
    const { prisma, state } = createFixture();
    state.appointments.set("appt-1", {
      id: "appt-1",
      tenantId: "tenant-1",
      customerId: "cust-1",
      serviceId: "svc-1",
      startsAt: new Date("2026-09-01T10:00:00.000Z"),
      endsAt: new Date("2026-09-01T11:00:00.000Z"),
      status: "confirmed",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createAppointmentService(prisma as never);

    const result = await service.getAppointment({ tenantId: "tenant-1", appointmentId: "appt-1" });

    expect(result).not.toBeNull();
    expect(result?.id).toBe("appt-1");
    expect(result?.status).toBe("confirmed");
  });

  it("returns null for cross-tenant getAppointment", async () => {
    const { prisma, state } = createFixture();
    state.appointments.set("appt-1", {
      id: "appt-1",
      tenantId: "tenant-2",
      customerId: "cust-1",
      serviceId: "svc-1",
      startsAt: new Date("2026-09-01T10:00:00.000Z"),
      endsAt: new Date("2026-09-01T11:00:00.000Z"),
      status: "confirmed",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createAppointmentService(prisma as never);

    const result = await service.getAppointment({ tenantId: "tenant-1", appointmentId: "appt-1" });

    expect(result).toBeNull();
  });

  it("returns null for nonexistent appointment via getAppointment", async () => {
    const { prisma } = createFixture();
    const service = createAppointmentService(prisma as never);

    const result = await service.getAppointment({ tenantId: "tenant-1", appointmentId: "missing" });

    expect(result).toBeNull();
  });

  // --- listAppointments ---

  it("lists only appointments belonging to the requesting tenant", async () => {
    const { prisma, state } = createFixture();
    state.appointments.set("appt-1", {
      id: "appt-1",
      tenantId: "tenant-1",
      customerId: "cust-1",
      serviceId: "svc-1",
      startsAt: new Date("2026-09-01T10:00:00.000Z"),
      endsAt: new Date("2026-09-01T11:00:00.000Z"),
      status: "confirmed",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    state.appointments.set("appt-2", {
      id: "appt-2",
      tenantId: "tenant-2",
      customerId: "cust-2",
      serviceId: "svc-2",
      startsAt: new Date("2026-09-02T10:00:00.000Z"),
      endsAt: new Date("2026-09-02T11:00:00.000Z"),
      status: "confirmed",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createAppointmentService(prisma as never);

    const results = await service.listAppointments({ tenantId: "tenant-1" });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("appt-1");
  });

  it("returns empty array when no appointments exist for tenant", async () => {
    const { prisma, state } = createFixture();
    state.appointments.set("appt-1", {
      id: "appt-1",
      tenantId: "tenant-2",
      customerId: "cust-2",
      serviceId: "svc-2",
      startsAt: new Date("2026-09-02T10:00:00.000Z"),
      endsAt: new Date("2026-09-02T11:00:00.000Z"),
      status: "confirmed",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createAppointmentService(prisma as never);

    const results = await service.listAppointments({ tenantId: "tenant-1" });

    expect(results).toHaveLength(0);
  });

  // --- updateAppointment ---

  it("updates valid supplied fields (startsAt, endsAt, status, notes)", async () => {
    const { prisma, state } = createFixture();
    state.appointments.set("appt-1", {
      id: "appt-1",
      tenantId: "tenant-1",
      customerId: "cust-1",
      serviceId: "svc-1",
      startsAt: new Date("2026-09-01T10:00:00.000Z"),
      endsAt: new Date("2026-09-01T11:00:00.000Z"),
      status: "confirmed",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createAppointmentService(prisma as never);

    const updated = await service.updateAppointment({
      tenantId: "tenant-1",
      appointmentId: "appt-1",
      input: {
        startsAt: new Date("2026-09-01T14:00:00.000Z"),
        endsAt: new Date("2026-09-01T15:00:00.000Z"),
        status: "completed",
        notes: "Done",
      },
    });

    expect(updated).not.toBeNull();
    expect(updated?.status).toBe("completed");
    expect(updated?.notes).toBe("Done");
  });

  it("preserves unspecified fields during partial update", async () => {
    const { prisma, state } = createFixture();
    state.appointments.set("appt-1", {
      id: "appt-1",
      tenantId: "tenant-1",
      customerId: "cust-1",
      serviceId: "svc-1",
      startsAt: new Date("2026-09-01T10:00:00.000Z"),
      endsAt: new Date("2026-09-01T11:00:00.000Z"),
      status: "confirmed",
      notes: "Original notes",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createAppointmentService(prisma as never);

    const updated = await service.updateAppointment({
      tenantId: "tenant-1",
      appointmentId: "appt-1",
      input: { status: "completed" },
    });

    expect(updated).not.toBeNull();
    expect(updated?.status).toBe("completed");
    expect(updated?.customerId).toBe("cust-1");
    expect(updated?.serviceId).toBe("svc-1");
    expect(updated?.notes).toBe("Original notes");
  });

  it("returns null when updating a nonexistent appointment", async () => {
    const { prisma } = createFixture();
    const service = createAppointmentService(prisma as never);

    const updated = await service.updateAppointment({
      tenantId: "tenant-1",
      appointmentId: "missing",
      input: { status: "completed" },
    });

    expect(updated).toBeNull();
  });

  it("returns null for cross-tenant updateAppointment (does NOT persist)", async () => {
    const { prisma, state } = createFixture();
    state.appointments.set("appt-1", {
      id: "appt-1",
      tenantId: "tenant-2",
      customerId: "cust-1",
      serviceId: "svc-1",
      startsAt: new Date("2026-09-01T10:00:00.000Z"),
      endsAt: new Date("2026-09-01T11:00:00.000Z"),
      status: "confirmed",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createAppointmentService(prisma as never);

    const updated = await service.updateAppointment({
      tenantId: "tenant-1",
      appointmentId: "appt-1",
      input: { status: "hijacked" },
    });

    expect(updated).toBeNull();
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  it("rejects updateAppointment with invalid startsAt", async () => {
    const { prisma, state } = createFixture();
    state.appointments.set("appt-1", {
      id: "appt-1",
      tenantId: "tenant-1",
      customerId: "cust-1",
      serviceId: "svc-1",
      startsAt: new Date("2026-09-01T10:00:00.000Z"),
      endsAt: new Date("2026-09-01T11:00:00.000Z"),
      status: "confirmed",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createAppointmentService(prisma as never);

    await expect(
      service.updateAppointment({
        tenantId: "tenant-1",
        appointmentId: "appt-1",
        input: { startsAt: new Date("invalid") },
      }),
    ).rejects.toThrow("appointment startsAt must be a valid date");
  });

  it("rejects updateAppointment with invalid endsAt", async () => {
    const { prisma, state } = createFixture();
    state.appointments.set("appt-1", {
      id: "appt-1",
      tenantId: "tenant-1",
      customerId: "cust-1",
      serviceId: "svc-1",
      startsAt: new Date("2026-09-01T10:00:00.000Z"),
      endsAt: new Date("2026-09-01T11:00:00.000Z"),
      status: "confirmed",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createAppointmentService(prisma as never);

    await expect(
      service.updateAppointment({
        tenantId: "tenant-1",
        appointmentId: "appt-1",
        input: { endsAt: new Date("invalid") },
      }),
    ).rejects.toThrow("appointment endsAt must be a valid date");
  });

  it("rejects updateAppointment when endsAt is not after startsAt", async () => {
    const { prisma, state } = createFixture();
    state.appointments.set("appt-1", {
      id: "appt-1",
      tenantId: "tenant-1",
      customerId: "cust-1",
      serviceId: "svc-1",
      startsAt: new Date("2026-09-01T10:00:00.000Z"),
      endsAt: new Date("2026-09-01T11:00:00.000Z"),
      status: "confirmed",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createAppointmentService(prisma as never);

    await expect(
      service.updateAppointment({
        tenantId: "tenant-1",
        appointmentId: "appt-1",
        input: { endsAt: new Date("2026-09-01T09:00:00.000Z") },
      }),
    ).rejects.toThrow("appointment endsAt must be after startsAt");
  });

  it("rejects updateAppointment with blank status", async () => {
    const { prisma, state } = createFixture();
    state.appointments.set("appt-1", {
      id: "appt-1",
      tenantId: "tenant-1",
      customerId: "cust-1",
      serviceId: "svc-1",
      startsAt: new Date("2026-09-01T10:00:00.000Z"),
      endsAt: new Date("2026-09-01T11:00:00.000Z"),
      status: "confirmed",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createAppointmentService(prisma as never);

    await expect(
      service.updateAppointment({
        tenantId: "tenant-1",
        appointmentId: "appt-1",
        input: { status: "   " },
      }),
    ).rejects.toThrow("appointment status is required");
  });

  it("rejects updateAppointment with empty notes string", async () => {
    const { prisma, state } = createFixture();
    state.appointments.set("appt-1", {
      id: "appt-1",
      tenantId: "tenant-1",
      customerId: "cust-1",
      serviceId: "svc-1",
      startsAt: new Date("2026-09-01T10:00:00.000Z"),
      endsAt: new Date("2026-09-01T11:00:00.000Z"),
      status: "confirmed",
      notes: "existing",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createAppointmentService(prisma as never);

    await expect(
      service.updateAppointment({
        tenantId: "tenant-1",
        appointmentId: "appt-1",
        input: { notes: "" },
      }),
    ).rejects.toThrow("appointment notes must be null or a non-empty string");
  });

  it("allows setting notes to null during update", async () => {
    const { prisma, state } = createFixture();
    state.appointments.set("appt-1", {
      id: "appt-1",
      tenantId: "tenant-1",
      customerId: "cust-1",
      serviceId: "svc-1",
      startsAt: new Date("2026-09-01T10:00:00.000Z"),
      endsAt: new Date("2026-09-01T11:00:00.000Z"),
      status: "confirmed",
      notes: "some notes",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createAppointmentService(prisma as never);

    const updated = await service.updateAppointment({
      tenantId: "tenant-1",
      appointmentId: "appt-1",
      input: { notes: null },
    });

    expect(updated).not.toBeNull();
    expect(updated?.notes).toBeNull();
  });

  it("verifies tenantId cannot be changed through update input", async () => {
    const { prisma, state } = createFixture();
    state.appointments.set("appt-1", {
      id: "appt-1",
      tenantId: "tenant-1",
      customerId: "cust-1",
      serviceId: "svc-1",
      startsAt: new Date("2026-09-01T10:00:00.000Z"),
      endsAt: new Date("2026-09-01T11:00:00.000Z"),
      status: "confirmed",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createAppointmentService(prisma as never);

    // The AppointmentUpdateInput type does not include tenantId,
    // so we verify the original tenantId is preserved after update
    const updated = await service.updateAppointment({
      tenantId: "tenant-1",
      appointmentId: "appt-1",
      input: { status: "completed" },
    });

    expect(updated).not.toBeNull();
    expect(updated?.tenantId).toBe("tenant-1");
    // Also verify the state still has the original tenantId
    const stored = state.appointments.get("appt-1");
    expect(stored?.tenantId).toBe("tenant-1");
  });

  it("allows updating startsAt and endsAt together", async () => {
    const { prisma, state } = createFixture();
    state.appointments.set("appt-1", {
      id: "appt-1",
      tenantId: "tenant-1",
      customerId: "cust-1",
      serviceId: "svc-1",
      startsAt: new Date("2026-09-01T10:00:00.000Z"),
      endsAt: new Date("2026-09-01T11:00:00.000Z"),
      status: "confirmed",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createAppointmentService(prisma as never);

    const updated = await service.updateAppointment({
      tenantId: "tenant-1",
      appointmentId: "appt-1",
      input: {
        startsAt: new Date("2026-09-02T14:00:00.000Z"),
        endsAt: new Date("2026-09-02T15:30:00.000Z"),
      },
    });

    expect(updated).not.toBeNull();
    expect(updated?.startsAt).toEqual(new Date("2026-09-02T14:00:00.000Z"));
    expect(updated?.endsAt).toEqual(new Date("2026-09-02T15:30:00.000Z"));
  });

  it("validates endsAt against new startsAt when both are supplied", async () => {
    const { prisma, state } = createFixture();
    state.appointments.set("appt-1", {
      id: "appt-1",
      tenantId: "tenant-1",
      customerId: "cust-1",
      serviceId: "svc-1",
      startsAt: new Date("2026-09-01T10:00:00.000Z"),
      endsAt: new Date("2026-09-01T11:00:00.000Z"),
      status: "confirmed",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createAppointmentService(prisma as never);

    await expect(
      service.updateAppointment({
        tenantId: "tenant-1",
        appointmentId: "appt-1",
        input: {
          startsAt: new Date("2026-09-01T15:00:00.000Z"),
          endsAt: new Date("2026-09-01T14:00:00.000Z"),
        },
      }),
    ).rejects.toThrow("appointment endsAt must be after startsAt");
  });

  it("persists branchId when an authenticated branch context is provided and the branch belongs to the same tenant", async () => {
    const { prisma, state } = createFixture();
    state.customers.set("cust-1", { id: "cust-1", tenantId: "tenant-1" });
    state.services.set("svc-1", { id: "svc-1", tenantId: "tenant-1" });
    state.branches.set("branch-1", { id: "branch-1", tenantId: "tenant-1" });
    const service = createAppointmentService(prisma as never);

    const result = await service.createAppointment({
      tenantId: "tenant-1",
      customerId: "cust-1",
      serviceId: "svc-1",
      branchId: "branch-1",
      startsAt: new Date("2026-09-02T10:00:00.000Z"),
      endsAt: new Date("2026-09-02T11:00:00.000Z"),
      status: "confirmed",
    });

    expect(result.branchId).toBe("branch-1");
  });

  it("persists branchId as null when no branch context is provided", async () => {
    const { prisma, state } = createFixture();
    state.customers.set("cust-1", { id: "cust-1", tenantId: "tenant-1" });
    state.services.set("svc-1", { id: "svc-1", tenantId: "tenant-1" });
    const service = createAppointmentService(prisma as never);

    const result = await service.createAppointment({
      tenantId: "tenant-1",
      customerId: "cust-1",
      serviceId: "svc-1",
      startsAt: new Date("2026-09-02T10:00:00.000Z"),
      endsAt: new Date("2026-09-02T11:00:00.000Z"),
      status: "confirmed",
    });

    expect(result.branchId).toBeNull();
  });

  it("rejects createAppointment when branchId refers to a branch in a different tenant", async () => {
    const { prisma, state } = createFixture();
    state.customers.set("cust-1", { id: "cust-1", tenantId: "tenant-1" });
    state.services.set("svc-1", { id: "svc-1", tenantId: "tenant-1" });
    state.branches.set("branch-other", { id: "branch-other", tenantId: "tenant-2" });
    const service = createAppointmentService(prisma as never);

    await expect(
      service.createAppointment({
        tenantId: "tenant-1",
        customerId: "cust-1",
        serviceId: "svc-1",
        branchId: "branch-other",
        startsAt: new Date("2026-09-02T10:00:00.000Z"),
        endsAt: new Date("2026-09-02T11:00:00.000Z"),
        status: "confirmed",
      }),
    ).rejects.toThrow("branch must belong to the same tenant");
  });
});
