import { describe, expect, it, vi } from "vitest";
import { createReportService } from "./report-service";

function createPrisma(
  invoices: Array<{ totalCents: number; issuedAt: Date }>,
  appointments: Array<{ startsAt: Date; status: string }> = [],
) {
  return {
    invoice: {
      findMany: vi.fn(async () => invoices),
    },
    appointment: {
      findMany: vi.fn(async () => appointments),
    },
    customer: {
      count: async () => 0,
    },
    stockItem: {
      count: async () => 0,
      findMany: async () => [],
    },
    stockMovement: {
      count: async () => 0,
    },
  } as never;
}

describe("report service: listDailySales", () => {
  it("groups invoices by date and sums revenue", async () => {
    const prisma = createPrisma([
      { totalCents: 1000, issuedAt: new Date("2026-08-01T10:00:00.000Z") },
      { totalCents: 2000, issuedAt: new Date("2026-08-01T14:00:00.000Z") },
      { totalCents: 1500, issuedAt: new Date("2026-08-02T09:00:00.000Z") },
    ]);
    const service = createReportService(prisma);

    const dailySales = await service.listDailySales({ tenantId: "tenant-1" });

    expect(dailySales).toHaveLength(2);
    expect(dailySales[0]).toMatchObject({ date: "2026-08-01", invoiceCount: 2, totalRevenueCents: 3000 });
    expect(dailySales[1]).toMatchObject({ date: "2026-08-02", invoiceCount: 1, totalRevenueCents: 1500 });
  });

  it("returns empty array when no invoices exist", async () => {
    const prisma = createPrisma([]);
    const service = createReportService(prisma);

    const dailySales = await service.listDailySales({ tenantId: "tenant-1" });

    expect(dailySales).toHaveLength(0);
  });

  it("returns daily sales in the order provided by the database", async () => {
    const prisma = createPrisma([
      { totalCents: 1000, issuedAt: new Date("2026-08-01T10:00:00.000Z") },
      { totalCents: 2000, issuedAt: new Date("2026-08-02T10:00:00.000Z") },
    ]);
    const service = createReportService(prisma);

    const dailySales = await service.listDailySales({ tenantId: "tenant-1" });

    expect(dailySales[0]?.date).toBe("2026-08-01");
    expect(dailySales[1]?.date).toBe("2026-08-02");
  });
});

describe("report service: listAppointmentReport", () => {
  it("groups appointments by date with counts and status breakdown", async () => {
    const prisma = createPrisma([], [
      { startsAt: new Date("2026-08-01T10:00:00.000Z"), status: "Booked" },
      { startsAt: new Date("2026-08-01T14:00:00.000Z"), status: "Booked" },
      { startsAt: new Date("2026-08-01T16:00:00.000Z"), status: "Completed" },
      { startsAt: new Date("2026-08-02T09:00:00.000Z"), status: "Booked" },
    ]);
    const service = createReportService(prisma);

    const report = await service.listAppointmentReport({ tenantId: "tenant-1" });

    expect(report).toHaveLength(2);
    expect(report[0]).toMatchObject({
      date: "2026-08-01",
      appointmentCount: 3,
      statusBreakdown: [
        { status: "Booked", count: 2 },
        { status: "Completed", count: 1 },
      ],
    });
    expect(report[1]).toMatchObject({
      date: "2026-08-02",
      appointmentCount: 1,
      statusBreakdown: [{ status: "Booked", count: 1 }],
    });
  });

  it("returns empty array when no appointments exist", async () => {
    const prisma = createPrisma([]);
    const service = createReportService(prisma);

    const report = await service.listAppointmentReport({ tenantId: "tenant-1" });

    expect(report).toHaveLength(0);
  });

  it("returns appointment report in the order provided by the database", async () => {
    const prisma = createPrisma([], [
      { startsAt: new Date("2026-08-01T10:00:00.000Z"), status: "Booked" },
      { startsAt: new Date("2026-08-02T10:00:00.000Z"), status: "Booked" },
    ]);
    const service = createReportService(prisma);

    const report = await service.listAppointmentReport({ tenantId: "tenant-1" });

    expect(report[0]?.date).toBe("2026-08-01");
    expect(report[1]?.date).toBe("2026-08-02");
  });
});
