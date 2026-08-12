import { describe, expect, it } from "vitest";
import { createAttendanceService } from "./attendance-service";
import { createStaffService } from "./staff-service";

describe("staff and attendance services", () => {
  it("creates a staff record within the tenant", async () => {
    const staffService = createStaffService({
      staff: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "staff-1", ...data }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      branch: {
        findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
      },
    } as never);

    const staff = await staffService.createStaff({
      tenantId: "tenant-1",
      displayName: "Mina Patel",
      email: "mina@example.com",
      phone: "5551234",
      branchId: "branch-1",
      isActive: true,
    });

    expect(staff.tenantId).toBe("tenant-1");
    expect(staff.displayName).toBe("Mina Patel");
    expect(staff.branchId).toBe("branch-1");
  });

  it("rejects staff creation when the branch belongs to another tenant", async () => {
    const staffService = createStaffService({
      staff: {
        create: async () => ({ id: "staff-1" }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      branch: {
        findUnique: async () => ({ id: "branch-2", tenantId: "tenant-2" }),
      },
    } as never);

    await expect(
      staffService.createStaff({
        tenantId: "tenant-1",
        displayName: "Mina Patel",
        branchId: "branch-2",
      }),
    ).rejects.toThrow("branch must belong to the same tenant");
  });

  it("returns only staff records from the requested tenant", async () => {
    const staffService = createStaffService({
      staff: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "staff-1", ...data }),
        findUnique: async () => null,
        findMany: async ({ where }: { where?: Record<string, unknown> }) => [
          { id: "staff-1", tenantId: "tenant-1", displayName: "Mina Patel", isActive: true },
          { id: "staff-2", tenantId: "tenant-2", displayName: "Other", isActive: true },
        ].filter((staff) => where?.tenantId === staff.tenantId),
      },
      branch: {
        findUnique: async () => null,
      },
    } as never);

    const staff = await staffService.listStaff({ tenantId: "tenant-1" });

    expect(staff).toHaveLength(1);
    expect(staff[0]?.tenantId).toBe("tenant-1");
  });

  it("creates attendance for a staff member in the same tenant", async () => {
    const attendanceService = createAttendanceService({
      attendance: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "attendance-1", ...data }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      staff: {
        findUnique: async () => ({ id: "staff-1", tenantId: "tenant-1" }),
      },
    } as never);

    const attendance = await attendanceService.createAttendance({
      tenantId: "tenant-1",
      staffId: "staff-1",
      checkInAt: new Date("2026-08-11T09:00:00.000Z"),
      status: "present",
      notes: "Arrived on time",
    });

    expect(attendance.tenantId).toBe("tenant-1");
    expect(attendance.status).toBe("present");
  });

  it("rejects attendance when the staff member belongs to another tenant", async () => {
    const attendanceService = createAttendanceService({
      attendance: {
        create: async () => ({ id: "attendance-1" }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      staff: {
        findUnique: async () => ({ id: "staff-1", tenantId: "tenant-2" }),
      },
    } as never);

    await expect(
      attendanceService.createAttendance({
        tenantId: "tenant-1",
        staffId: "staff-1",
        checkInAt: new Date("2026-08-11T09:00:00.000Z"),
      }),
    ).rejects.toThrow("staff must belong to the same tenant");
  });
});
