import { describe, expect, it, vi } from "vitest";
import { createAttendanceService } from "./attendance-service";

function createFixture() {
  type AttendanceState = {
    id: string;
    tenantId: string;
    staffId: string;
    checkInAt: Date;
    checkOutAt: Date | null;
    status: string | null;
    notes: string | null;
  };
  const state = {
    attendance: new Map<string, AttendanceState>(),
    staff: new Map<string, { id: string; tenantId: string }>(),
  };
  const prisma = {
    attendance: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        state.attendance.get(where.id) ?? null),
      findMany: vi.fn(async ({ where }: { where?: { tenantId?: string } }) =>
        [...state.attendance.values()].filter((a) => a.tenantId === where?.tenantId),
      ),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = { id: "attendance-1", ...data } as AttendanceState;
        state.attendance.set(record.id, record);
        return record;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const existing = state.attendance.get(where.id);
        const updated = { ...existing, ...data } as AttendanceState;
        state.attendance.set(where.id, updated);
        return updated;
      }),
    },
    staff: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        state.staff.get(where.id) ?? null),
    },
  };
  return { prisma, state };
}

describe("attendance service: updateAttendance", () => {
  it("updates checkOutAt, status, and notes for an existing attendance record", async () => {
    const { prisma, state } = createFixture();
    state.staff.set("staff-1", { id: "staff-1", tenantId: "tenant-1" });
    state.attendance.set("attendance-1", {
      id: "attendance-1",
      tenantId: "tenant-1",
      staffId: "staff-1",
      checkInAt: new Date("2026-08-12T09:00:00.000Z"),
      checkOutAt: null,
      status: "present",
      notes: null,
    });
    const service = createAttendanceService(prisma as never);

    const updated = await service.updateAttendance({
      tenantId: "tenant-1",
      attendanceId: "attendance-1",
      input: {
        checkOutAt: new Date("2026-08-12T17:00:00.000Z"),
        status: "checked-out",
        notes: "Left on time",
      },
    });

    expect(updated).not.toBeNull();
    expect(updated?.checkOutAt).toEqual(new Date("2026-08-12T17:00:00.000Z"));
    expect(updated?.status).toBe("checked-out");
    expect(updated?.notes).toBe("Left on time");
  });

  it("returns null when the attendance record belongs to another tenant", async () => {
    const { prisma, state } = createFixture();
    state.staff.set("staff-1", { id: "staff-1", tenantId: "tenant-2" });
    state.attendance.set("attendance-1", {
      id: "attendance-1",
      tenantId: "tenant-2",
      staffId: "staff-1",
      checkInAt: new Date("2026-08-12T09:00:00.000Z"),
      checkOutAt: null,
      status: null,
      notes: null,
    });
    const service = createAttendanceService(prisma as never);

    const updated = await service.updateAttendance({
      tenantId: "tenant-1",
      attendanceId: "attendance-1",
      input: { checkOutAt: new Date("2026-08-12T17:00:00.000Z") },
    });

    expect(updated).toBeNull();
  });

  it("returns null when the attendance record does not exist", async () => {
    const { prisma, state } = createFixture();
    state.staff.set("staff-1", { id: "staff-1", tenantId: "tenant-1" });
    const service = createAttendanceService(prisma as never);

    const updated = await service.updateAttendance({
      tenantId: "tenant-1",
      attendanceId: "missing",
      input: { checkOutAt: new Date("2026-08-12T17:00:00.000Z") },
    });

    expect(updated).toBeNull();
  });

  it("throws when the referenced staff member belongs to another tenant", async () => {
    const { prisma, state } = createFixture();
    state.staff.set("staff-1", { id: "staff-1", tenantId: "tenant-2" });
    state.attendance.set("attendance-1", {
      id: "attendance-1",
      tenantId: "tenant-1",
      staffId: "staff-1",
      checkInAt: new Date("2026-08-12T09:00:00.000Z"),
      checkOutAt: null,
      status: null,
      notes: null,
    });
    const service = createAttendanceService(prisma as never);

    await expect(
      service.updateAttendance({
        tenantId: "tenant-1",
        attendanceId: "attendance-1",
        input: { checkOutAt: new Date("2026-08-12T17:00:00.000Z") },
      }),
    ).rejects.toThrow("staff must belong to the same tenant");
  });

  it("does not modify checkInAt through the update operation", async () => {
    const { prisma, state } = createFixture();
    state.staff.set("staff-1", { id: "staff-1", tenantId: "tenant-1" });
    const checkInAt = new Date("2026-08-12T09:00:00.000Z");
    state.attendance.set("attendance-1", {
      id: "attendance-1",
      tenantId: "tenant-1",
      staffId: "staff-1",
      checkInAt,
      checkOutAt: null,
      status: "present",
      notes: null,
    });
    const service = createAttendanceService(prisma as never);

    const updated = await service.updateAttendance({
      tenantId: "tenant-1",
      attendanceId: "attendance-1",
      input: { checkOutAt: new Date("2026-08-12T17:00:00.000Z") },
    });

    expect(updated?.checkInAt).toEqual(checkInAt);
  });

  it("updates only the provided fields", async () => {
    const { prisma, state } = createFixture();
    state.staff.set("staff-1", { id: "staff-1", tenantId: "tenant-1" });
    state.attendance.set("attendance-1", {
      id: "attendance-1",
      tenantId: "tenant-1",
      staffId: "staff-1",
      checkInAt: new Date("2026-08-12T09:00:00.000Z"),
      checkOutAt: null,
      status: "present",
      notes: "Arrived on time",
    });
    const service = createAttendanceService(prisma as never);

    const updated = await service.updateAttendance({
      tenantId: "tenant-1",
      attendanceId: "attendance-1",
      input: { status: "checked-out" },
    });

    expect(updated?.status).toBe("checked-out");
    expect(updated?.checkOutAt).toBeNull();
    expect(updated?.notes).toBe("Arrived on time");
  });
});
