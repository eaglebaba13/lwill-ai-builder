import { describe, expect, it, vi } from "vitest";
import { createReportService } from "./report-service";

function createPrisma(
  invoices: Array<{ totalCents: number; issuedAt: Date }>,
  appointments: Array<{ startsAt: Date; status: string }> = [],
  memberships: Array<{ status: string; packageId: string }> = [],
  packages: Array<{ id: string; name: string }> = [],
  branches: Array<{ id: string; name: string }> = [],
  stockItems: Array<{ id: string; productId: string; branchId: string; quantity: number }> = [],
  products: Array<{ id: string; name: string }> = [],
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
      count: async () => stockItems.length,
      findMany: vi.fn(async (args?: { where?: Record<string, unknown> }) => {
        const branchId = (args?.where as Record<string, unknown> | undefined)?.branchId as string | undefined;
        if (branchId) {
          return stockItems.filter((item) => item.branchId === branchId);
        }
        return stockItems;
      }),
    },
    stockMovement: {
      count: async () => 0,
    },
    membership: {
      findMany: vi.fn(async () => memberships),
    },
    package: {
      findMany: vi.fn(async () => packages),
    },
    branch: {
      findMany: vi.fn(async () => branches),
    },
    product: {
      findMany: vi.fn(async () => products),
    },
    staff: {
      count: vi.fn(async () => 0),
    },
    attendance: {
      count: vi.fn(async () => 0),
    },
  } as never;
}

describe("report service: listDailySales", () => {
  it("groups invoices by date and sums revenue", async () => {
    const prisma = createPrisma([
      { totalCents: 1000, issuedAt: new Date("2026-08-01T10:00:00.000Z") },
      { totalCents: 2000, issuedAt: new Date("2026-08-01T14:00:00.000Z") },
      { totalCents: 1500, issuedAt: new Date("2026-08-02T11:00:00.000Z") },
    ]);

    const service = createReportService(prisma);
    const sales = await service.listDailySales({ tenantId: "tenant-1" });

    expect(sales).toHaveLength(2);
    expect(sales[0]).toEqual({
      date: "2026-08-01",
      invoiceCount: 2,
      totalRevenueCents: 3000,
    });
    expect(sales[1]).toEqual({
      date: "2026-08-02",
      invoiceCount: 1,
      totalRevenueCents: 1500,
    });
  });

  it("returns empty array when no invoices exist", async () => {
    const prisma = createPrisma([]);
    const service = createReportService(prisma);
    const sales = await service.listDailySales({ tenantId: "tenant-1" });

    expect(sales).toHaveLength(0);
  });
});

describe("report service: listAppointmentReport", () => {
  it("aggregates appointments by date and status", async () => {
    const prisma = createPrisma(
      [],
      [
        { startsAt: new Date("2026-08-01T10:00:00.000Z"), status: "Completed" },
        { startsAt: new Date("2026-08-01T14:00:00.000Z"), status: "Booked" },
        { startsAt: new Date("2026-08-02T11:00:00.000Z"), status: "Completed" },
      ],
    );

    const service = createReportService(prisma);
    const report = await service.listAppointmentReport({ tenantId: "tenant-1" });

    expect(report).toHaveLength(2);
    expect(report[0]?.date).toBe("2026-08-01");
    expect(report[0]?.appointmentCount).toBe(2);
    expect(report[0]?.statusBreakdown).toEqual([
      { status: "Completed", count: 1 },
      { status: "Booked", count: 1 },
    ]);
  });

  it("returns empty array when no appointments exist", async () => {
    const prisma = createPrisma([]);
    const service = createReportService(prisma);
    const report = await service.listAppointmentReport({ tenantId: "tenant-1" });

    expect(report).toHaveLength(0);
  });
});

describe("report service: listMembershipReport", () => {
  it("aggregates memberships by status and package", async () => {
    const prisma = createPrisma(
      [],
      [],
      [
        { status: "active", packageId: "pkg-1" },
        { status: "active", packageId: "pkg-1" },
        { status: "expired", packageId: "pkg-2" },
      ],
      [
        { id: "pkg-1", name: "Gold Plan" },
        { id: "pkg-2", name: "Silver Plan" },
      ],
    );

    const service = createReportService(prisma);
    const report = await service.listMembershipReport({ tenantId: "tenant-1" });

    expect(report).toHaveLength(2);
    const active = report.find((item) => item.status === "active");
    expect(active?.count).toBe(2);
    expect(active?.packageBreakdown).toEqual([
      { packageId: "Gold Plan", packageName: "Gold Plan", count: 2 },
    ]);
  });

  it("returns empty array when no memberships exist", async () => {
    const prisma = createPrisma([]);
    const service = createReportService(prisma);
    const report = await service.listMembershipReport({ tenantId: "tenant-1" });

    expect(report).toHaveLength(0);
  });
});

describe("report service: listPackageUtilizationReport", () => {
  it("calculates utilization per package", async () => {
    const prisma = createPrisma(
      [],
      [],
      [
        { status: "active", packageId: "pkg-1" },
        { status: "expired", packageId: "pkg-1" },
        { status: "active", packageId: "pkg-2" },
      ],
      [
        { id: "pkg-1", name: "Gold Plan" },
        { id: "pkg-2", name: "Silver Plan" },
      ],
    );

    const service = createReportService(prisma);
    const report = await service.listPackageUtilizationReport({ tenantId: "tenant-1" });

    expect(report).toHaveLength(2);
    const gold = report.find((item) => item.packageId === "pkg-1");
    expect(gold).toEqual({
      packageId: "pkg-1",
      packageName: "Gold Plan",
      totalMemberships: 2,
      activeMemberships: 1,
    });
  });

  it("returns empty array when no packages exist", async () => {
    const prisma = createPrisma([]);
    const service = createReportService(prisma);
    const report = await service.listPackageUtilizationReport({ tenantId: "tenant-1" });

    expect(report).toHaveLength(0);
  });
});

describe("report service: getGstSummary", () => {
  it("calculates GST totals across all invoices", async () => {
    const prisma = createPrisma([
      { totalCents: 1180, issuedAt: new Date() },
      { totalCents: 2360, issuedAt: new Date() },
    ]);
    prisma.invoice.findMany = vi.fn(async () => [
      { gstCents: 180, subtotalCents: 1000 },
      { gstCents: 360, subtotalCents: 2000 },
    ]);

    const service = createReportService(prisma);
    const summary = await service.getGstSummary({ tenantId: "tenant-1" });

    expect(summary).toEqual({
      totalGstCents: 540,
      totalTaxableCents: 3000,
      invoiceCount: 2,
    });
  });

  it("returns zeros when no invoices exist", async () => {
    const prisma = createPrisma([]);
    const service = createReportService(prisma);
    const summary = await service.getGstSummary({ tenantId: "tenant-1" });

    expect(summary).toEqual({
      totalGstCents: 0,
      totalTaxableCents: 0,
      invoiceCount: 0,
    });
  });
});

describe("report service: listBranchPerformance", () => {
  it("aggregates staff and attendance per branch", async () => {
    const prisma = createPrisma([], [], [], [], [{ id: "branch-1", name: "Main" }]);

    const service = createReportService(prisma);
    const report = await service.listBranchPerformance({ tenantId: "tenant-1" });

    expect(report).toHaveLength(1);
    expect(report[0]).toMatchObject({
      branchId: "branch-1",
      branchName: "Main",
      staffCount: 0,
      attendanceCount: 0,
    });
  });

  it("returns empty list when no branches exist", async () => {
    const prisma = createPrisma([], [], [], [], []);

    const service = createReportService(prisma);
    const report = await service.listBranchPerformance({ tenantId: "tenant-1" });

    expect(report).toHaveLength(0);
  });
});

describe("report service: getInventoryStockReport", () => {
  it("returns inventory stock report with mapped product and branch names", async () => {
    const prisma = createPrisma(
      [],
      [],
      [],
      [],
      [{ id: "branch-1", name: "Main Branch" }],
      [{ id: "item-1", productId: "prod-1", branchId: "branch-1", quantity: 25 }],
      [{ id: "prod-1", name: "Cuticle Oil" }],
    );

    const service = createReportService(prisma);
    const report = await service.getInventoryStockReport({ tenantId: "tenant-1" });

    expect(report).toHaveLength(1);
    expect(report[0]).toMatchObject({
      stockItemId: "item-1",
      productId: "prod-1",
      productName: "Cuticle Oil",
      branchId: "branch-1",
      branchName: "Main Branch",
      quantity: 25,
    });
  });

  it("filters inventory stock report by branchId", async () => {
    const prisma = createPrisma(
      [],
      [],
      [],
      [],
      [
        { id: "branch-1", name: "Main Branch" },
        { id: "branch-2", name: "North Branch" },
      ],
      [
        { id: "item-1", productId: "prod-1", branchId: "branch-1", quantity: 25 },
        { id: "item-2", productId: "prod-1", branchId: "branch-2", quantity: 10 },
      ],
      [{ id: "prod-1", name: "Cuticle Oil" }],
    );

    const service = createReportService(prisma);
    const report = await service.getInventoryStockReport({ tenantId: "tenant-1", branchId: "branch-1" });

    expect(report).toHaveLength(1);
    expect(report[0]).toMatchObject({
      stockItemId: "item-1",
      branchId: "branch-1",
      quantity: 25,
    });
  });

  it("returns empty report when no stock items exist", async () => {
    const prisma = createPrisma([], [], [], [], [], [], []);
    const service = createReportService(prisma);
    const report = await service.getInventoryStockReport({ tenantId: "tenant-1" });

    expect(report).toHaveLength(0);
  });
});