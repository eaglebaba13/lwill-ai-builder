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

describe("report service: listMembershipReport", () => {
  it("groups memberships by status with package breakdown", async () => {
    const prisma = createPrisma(
      [],
      [],
      [
        { status: "Active", packageId: "pkg-1" },
        { status: "Active", packageId: "pkg-1" },
        { status: "Active", packageId: "pkg-2" },
        { status: "Expired", packageId: "pkg-1" },
      ],
      [
        { id: "pkg-1", name: "Basic" },
        { id: "pkg-2", name: "Premium" },
      ],
    );
    const service = createReportService(prisma);

    const report = await service.listMembershipReport({ tenantId: "tenant-1" });

    expect(report).toHaveLength(2);
    expect(report[0]).toMatchObject({
      status: "Active",
      count: 3,
      packageBreakdown: [
        { packageId: "Basic", packageName: "Basic", count: 2 },
        { packageId: "Premium", packageName: "Premium", count: 1 },
      ],
    });
    expect(report[1]).toMatchObject({
      status: "Expired",
      count: 1,
      packageBreakdown: [{ packageId: "Basic", packageName: "Basic", count: 1 }],
    });
  });

  it("returns empty array when no memberships exist", async () => {
    const prisma = createPrisma([]);
    const service = createReportService(prisma);

    const report = await service.listMembershipReport({ tenantId: "tenant-1" });

    expect(report).toHaveLength(0);
  });

  it("maps unknown package IDs to Unknown", async () => {
    const prisma = createPrisma([], [], [{ status: "active", packageId: "missing" }], []);
    const service = createReportService(prisma);

    const report = await service.listMembershipReport({ tenantId: "tenant-1" });

    expect(report[0]?.packageBreakdown).toEqual([{ packageId: "Unknown", packageName: "Unknown", count: 1 }]);
  });
});

describe("report service: listPackageUtilizationReport", () => {
  it("returns package utilization with total and active membership counts", async () => {
    const prisma = createPrisma(
      [],
      [],
      [
        { status: "active", packageId: "pkg-1" },
        { status: "active", packageId: "pkg-1" },
        { status: "expired", packageId: "pkg-1" },
        { status: "active", packageId: "pkg-2" },
      ],
      [
        { id: "pkg-1", name: "Basic" },
        { id: "pkg-2", name: "Premium" },
      ],
    );
    const service = createReportService(prisma);

    const report = await service.listPackageUtilizationReport({ tenantId: "tenant-1" });

    expect(report).toHaveLength(2);
    expect(report[0]).toMatchObject({
      packageId: "pkg-1",
      packageName: "Basic",
      totalMemberships: 3,
      activeMemberships: 2,
    });
    expect(report[1]).toMatchObject({
      packageId: "pkg-2",
      packageName: "Premium",
      totalMemberships: 1,
      activeMemberships: 1,
    });
  });

  it("returns empty array when no memberships exist", async () => {
    const prisma = createPrisma([]);
    const service = createReportService(prisma);

    const report = await service.listPackageUtilizationReport({ tenantId: "tenant-1" });

    expect(report).toHaveLength(0);
  });

  it("maps unknown package IDs to Unknown", async () => {
    const prisma = createPrisma([], [], [{ status: "active", packageId: "missing" }], []);
    const service = createReportService(prisma);

    const report = await service.listPackageUtilizationReport({ tenantId: "tenant-1" });

    expect(report[0]).toMatchObject({
      packageId: "missing",
      packageName: "Unknown",
      totalMemberships: 1,
      activeMemberships: 1,
    });
  });
});

describe("report service: getGstSummary", () => {
  it("summarizes GST and taxable amounts from invoices", async () => {
    const prisma = createPrisma([
      { totalCents: 1500, issuedAt: new Date("2026-08-01T10:00:00.000Z") },
      { totalCents: 2000, issuedAt: new Date("2026-08-02T10:00:00.000Z") },
    ]);
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([
      { totalCents: 1500, issuedAt: new Date("2026-08-01T10:00:00.000Z"), gstCents: 150, subtotalCents: 1350 },
      { totalCents: 2000, issuedAt: new Date("2026-08-02T10:00:00.000Z"), gstCents: 200, subtotalCents: 1800 },
    ] as never);
    const service = createReportService(prisma);

    const summary = await service.getGstSummary({ tenantId: "tenant-1" });

    expect(summary).toMatchObject({
      totalGstCents: 350,
      totalTaxableCents: 3150,
      invoiceCount: 2,
    });
  });

  it("returns zero values when no invoices exist", async () => {
    const prisma = createPrisma([]);
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([] as never);
    const service = createReportService(prisma);

    const summary = await service.getGstSummary({ tenantId: "tenant-1" });

    expect(summary).toMatchObject({
      totalGstCents: 0,
      totalTaxableCents: 0,
      invoiceCount: 0,
    });
  });
});

describe("report service: listPackageUtilizationReport", () => {
  it("returns package utilization with total and active membership counts", async () => {
    const prisma = createPrisma(
      [],
      [],
      [
        { status: "active", packageId: "pkg-1" },
        { status: "active", packageId: "pkg-1" },
        { status: "expired", packageId: "pkg-1" },
        { status: "active", packageId: "pkg-2" },
      ],
      [
        { id: "pkg-1", name: "Basic" },
        { id: "pkg-2", name: "Premium" },
      ],
    );
    const service = createReportService(prisma);

    const report = await service.listPackageUtilizationReport({ tenantId: "tenant-1" });

    expect(report).toHaveLength(2);
    expect(report[0]).toMatchObject({
      packageId: "pkg-1",
      packageName: "Basic",
      totalMemberships: 3,
      activeMemberships: 2,
    });
    expect(report[1]).toMatchObject({
      packageId: "pkg-2",
      packageName: "Premium",
      totalMemberships: 1,
      activeMemberships: 1,
    });
  });

  it("returns empty array when no memberships exist", async () => {
    const prisma = createPrisma([]);
    const service = createReportService(prisma);

    const report = await service.listPackageUtilizationReport({ tenantId: "tenant-1" });

    expect(report).toHaveLength(0);
  });

  it("maps unknown package IDs to Unknown", async () => {
    const prisma = createPrisma([], [], [{ status: "active", packageId: "missing" }], []);
    const service = createReportService(prisma);

    const report = await service.listPackageUtilizationReport({ tenantId: "tenant-1" });

    expect(report[0]).toMatchObject({
      packageId: "missing",
      packageName: "Unknown",
      totalMemberships: 1,
      activeMemberships: 1,
    });
  });
});

describe("report service: listBranchPerformance", () => {
  it("returns branch performance with staff and attendance counts", async () => {
    const prisma = createPrisma(
      [],
      [],
      [],
      [],
      [
        { id: "branch-1", name: "Main" },
        { id: "branch-2", name: "North" },
      ],
    );
    vi.mocked(prisma.branch.findMany).mockResolvedValue([
      { id: "branch-1", name: "Main" },
      { id: "branch-2", name: "North" },
    ] as never);
    vi.mocked(prisma.staff.count).mockImplementation(async ({ where }) => {
      if (where.branchId === "branch-1") return 5;
      if (where.branchId === "branch-2") return 3;
      return 0;
    });
    vi.mocked(prisma.attendance.count).mockImplementation(async ({ where }) => {
      if (where.staff?.branchId === "branch-1") return 12;
      if (where.staff?.branchId === "branch-2") return 7;
      return 0;
    });

    const service = createReportService(prisma);

    const report = await service.listBranchPerformance({ tenantId: "tenant-1" });

    expect(report).toHaveLength(2);
    expect(report[0]).toMatchObject({
      branchId: "branch-1",
      branchName: "Main",
      staffCount: 5,
      attendanceCount: 12,
    });
    expect(report[1]).toMatchObject({
      branchId: "branch-2",
      branchName: "North",
      staffCount: 3,
      attendanceCount: 7,
    });
  });

  it("returns empty array when no branches exist", async () => {
    const prisma = createPrisma([], [], [], [], []);
    vi.mocked(prisma.branch.findMany).mockResolvedValue([] as never);
    const service = createReportService(prisma);

    const report = await service.listBranchPerformance({ tenantId: "tenant-1" });

    expect(report).toHaveLength(0);
  });

  it("returns zero counts for branches with no staff or attendance", async () => {
    const prisma = createPrisma([], [], [], [], [{ id: "branch-1", name: "Empty" }]);
    vi.mocked(prisma.branch.findMany).mockResolvedValue([{ id: "branch-1", name: "Empty" }] as never);
    vi.mocked(prisma.staff.count).mockResolvedValue(0);
    vi.mocked(prisma.attendance.count).mockResolvedValue(0);
    const service = createReportService(prisma);

    const report = await service.listBranchPerformance({ tenantId: "tenant-1" });

    expect(report).toHaveLength(1);
    expect(report[0]).toMatchObject({
      branchId: "branch-1",
      branchName: "Empty",
      staffCount: 0,
      attendanceCount: 0,
    });
  });
});

describe("report service: getFranchiseOverview", () => {
  it("returns operational overview with branches, sales, appointments, customers, inventory, and branch performance", async () => {
    const prisma = {
      invoice: { findMany: vi.fn(async () => [
        { totalCents: 5000, issuedAt: new Date("2026-08-01") },
        { totalCents: 3000, issuedAt: new Date("2026-08-02") },
      ]) },
      appointment: { findMany: vi.fn(async () => [
        { startsAt: new Date("2026-08-01T10:00:00.000Z"), status: "Booked" },
        { startsAt: new Date("2026-08-01T14:00:00.000Z"), status: "Completed" },
      ]) },
      customer: { count: vi.fn(async () => 10) },
      stockItem: { findMany: vi.fn(async () => [
        { productId: "product-1", branchId: "branch-1", quantity: 5 },
        { productId: "product-2", branchId: "branch-2", quantity: 15 },
      ]) },
      product: { findMany: vi.fn(async () => [
        { id: "product-1", name: "Nail Polish" },
        { id: "product-2", name: "Cuticle Oil" },
      ]) },
      stockMovement: { count: vi.fn(async () => 0) },
      branch: { findMany: vi.fn(async () => [
        { id: "branch-1", name: "Main", isActive: true, createdAt: new Date("2026-01-01") },
        { id: "branch-2", name: "North", isActive: true, createdAt: new Date("2026-01-02") },
      ]) },
      staff: { count: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        if (where.branchId === "branch-1") return 3;
        if (where.branchId === "branch-2") return 2;
        return 0;
      }) },
      attendance: { count: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        if (where.staff?.branchId === "branch-1") return 8;
        if (where.staff?.branchId === "branch-2") return 5;
        return 0;
      }) },
      package: { findMany: vi.fn(async () => []) },
      membership: { findMany: vi.fn(async () => []) },
    } as never;

    const service = createReportService(prisma);
    const overview = await service.getFranchiseOverview({ tenantId: "tenant-1" });

    expect(overview.branches).toHaveLength(2);
    expect(overview.branches[0]).toMatchObject({
      branchId: "branch-1",
      branchName: "Main",
      isActive: true,
    });
    expect(overview.sales.invoiceCount).toBe(2);
    expect(overview.sales.totalRevenueCents).toBe(8000);
    expect(overview.sales.dailyTrend).toHaveLength(2);
    expect(overview.appointments.total).toBe(2);
    expect(overview.customers.total).toBe(10);
    expect(overview.inventory.lowStockItems).toHaveLength(1);
    expect(overview.inventory.lowStockItems[0]).toMatchObject({
      productId: "product-1",
      productName: "Nail Polish",
      branchId: "branch-1",
      quantity: 5,
    });
    expect(overview.branchPerformance).toHaveLength(2);
    expect(overview.branchPerformance[0]).toMatchObject({
      branchId: "branch-1",
      branchName: "Main",
      staffCount: 3,
      attendanceCount: 8,
    });
  });

  it("returns empty overview when no data exists", async () => {
    const prisma = {
      invoice: { findMany: vi.fn(async () => []) },
      appointment: { findMany: vi.fn(async () => []) },
      customer: { count: vi.fn(async () => 0) },
      stockItem: { findMany: vi.fn(async () => []) },
      product: { findMany: vi.fn(async () => []) },
      stockMovement: { count: vi.fn(async () => 0) },
      branch: { findMany: vi.fn(async () => []) },
      staff: { count: vi.fn(async () => 0) },
      attendance: { count: vi.fn(async () => 0) },
      package: { findMany: vi.fn(async () => []) },
      membership: { findMany: vi.fn(async () => []) },
    } as never;

    const service = createReportService(prisma);
    const overview = await service.getFranchiseOverview({ tenantId: "tenant-1" });

    expect(overview.branches).toHaveLength(0);
    expect(overview.sales.invoiceCount).toBe(0);
    expect(overview.sales.totalRevenueCents).toBe(0);
    expect(overview.sales.dailyTrend).toHaveLength(0);
    expect(overview.appointments.total).toBe(0);
    expect(overview.customers.total).toBe(0);
    expect(overview.inventory.lowStockItems).toHaveLength(0);
    expect(overview.branchPerformance).toHaveLength(0);
  });

  it("returns scoped overview for a linked franchise partner", async () => {
    const prisma = {
      invoice: { findMany: vi.fn(async (args: { where?: Record<string, unknown> }) => {
        const where = args.where as Record<string, unknown> | undefined;
        if (where?.branchId && typeof where.branchId === "object" && "in" in (where.branchId as Record<string, unknown>)) {
          const allowed = new Set((where.branchId as { in: string[] }).in);
          return [
            { totalCents: 5000, issuedAt: new Date("2026-08-01") },
          ].filter((inv) => allowed.has("branch-1"));
        }
        return [
          { totalCents: 5000, issuedAt: new Date("2026-08-01") },
          { totalCents: 3000, issuedAt: new Date("2026-08-02") },
        ];
      }) },
      appointment: { findMany: vi.fn(async (args: { where?: Record<string, unknown> }) => {
        const where = args.where as Record<string, unknown> | undefined;
        if (where?.branchId && typeof where.branchId === "object" && "in" in (where.branchId as Record<string, unknown>)) {
          const allowed = new Set((where.branchId as { in: string[] }).in);
          return [
            { startsAt: new Date("2026-08-01T10:00:00.000Z"), status: "Booked" },
          ].filter((apt) => allowed.has("branch-1"));
        }
        return [];
      }) },
      customer: { count: vi.fn(async () => 10) },
      stockItem: { findMany: vi.fn(async (args: { where?: Record<string, unknown> }) => {
        const where = args.where as Record<string, unknown> | undefined;
        if (where?.branchId && typeof where.branchId === "object" && "in" in (where.branchId as Record<string, unknown>)) {
          const allowed = new Set((where.branchId as { in: string[] }).in);
          return [
            { productId: "product-1", branchId: "branch-1", quantity: 5 },
          ].filter((item) => allowed.has(item.branchId));
        }
        return [];
      }) },
      product: { findMany: vi.fn(async () => [
        { id: "product-1", name: "Nail Polish" },
      ]) },
      stockMovement: { count: vi.fn(async () => 0) },
      branch: { findMany: vi.fn(async (args: { where?: Record<string, unknown> }) => {
        const where = args.where as Record<string, unknown> | undefined;
        if (where?.id && typeof where.id === "object" && "in" in (where.id as Record<string, unknown>)) {
          const allowed = new Set((where.id as { in: string[] }).in);
          return [
            { id: "branch-1", name: "Main", isActive: true, createdAt: new Date("2026-01-01") },
            { id: "branch-2", name: "North", isActive: true, createdAt: new Date("2026-01-02") },
          ].filter((b) => allowed.has(b.id));
        }
        return [];
      }) },
      staff: { count: vi.fn(async () => 0) },
      attendance: { count: vi.fn(async () => 0) },
      package: { findMany: vi.fn(async () => []) },
      membership: { findMany: vi.fn(async () => []) },
      franchisePartner: {
        findFirst: vi.fn(async () => ({ id: "partner-1" })),
        findMany: vi.fn(async () => []),
      },
      franchiseOutletProfile: {
        findMany: vi.fn(async () => [
          { branchId: "branch-1" },
        ]),
      },
    } as never;

    const service = createReportService(prisma);
    const overview = await service.getFranchiseOverview({ tenantId: "tenant-1", userId: "user-1" });

    expect(overview.branches).toHaveLength(1);
    expect(overview.branches[0]!.branchId).toBe("branch-1");
    expect(overview.sales.invoiceCount).toBe(1);
    expect(overview.sales.totalRevenueCents).toBe(5000);
    expect(overview.appointments.total).toBe(1);
    expect(overview.inventory.lowStockItems).toHaveLength(1);
    expect(overview.inventory.lowStockItems[0]!.branchId).toBe("branch-1");
    expect(overview.branchPerformance).toHaveLength(1);
    expect(overview.branchPerformance[0]!.branchId).toBe("branch-1");
  });

  it("returns empty overview for user with no franchise partner link", async () => {
    const prisma = {
      invoice: { findMany: vi.fn(async () => []) },
      appointment: { findMany: vi.fn(async () => []) },
      customer: { count: vi.fn(async () => 0) },
      stockItem: { findMany: vi.fn(async () => []) },
      product: { findMany: vi.fn(async () => []) },
      stockMovement: { count: vi.fn(async () => 0) },
      branch: { findMany: vi.fn(async () => []) },
      staff: { count: vi.fn(async () => 0) },
      attendance: { count: vi.fn(async () => 0) },
      package: { findMany: vi.fn(async () => []) },
      membership: { findMany: vi.fn(async () => []) },
      franchisePartner: {
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
      },
      franchiseOutletProfile: {
        findMany: vi.fn(async () => []),
      },
    } as never;

    const service = createReportService(prisma);
    const overview = await service.getFranchiseOverview({ tenantId: "tenant-1", userId: "user-unknown" });

    expect(overview.branches).toHaveLength(0);
    expect(overview.sales.invoiceCount).toBe(0);
    expect(overview.appointments.total).toBe(0);
    expect(overview.customers.total).toBe(0);
    expect(overview.inventory.lowStockItems).toHaveLength(0);
    expect(overview.branchPerformance).toHaveLength(0);
  });
});

describe("report service: getFranchisePayout", () => {
  const baseDate = (day: number) => new Date(`2026-08-${String(day).padStart(2, "0")}T00:00:00.000Z`);

  function createFranchisePrisma(input: {
    partners: Array<{ id: string; userId?: string; name: string }>;
    territories: Array<{ id: string; name: string }>;
    branches: Array<{ id: string; name: string; territoryId: string | null }>;
    agreements: Array<{
      id: string;
      tenantId: string;
      partnerId: string;
      territoryId: string;
      startDate: Date;
      endDate: Date | null;
      minimumGuaranteeCents?: number | null;
      mgFormulaRateBp?: number | null;
      partner: { id: string; name: string };
      territory: { id: string; name: string };
      outlets: Array<{
        id: string;
        branchId: string;
        branch: { id: string; name: string; territoryId: string | null };
      }>;
    }>;
    invoices: Array<{ branchId: string; totalCents: number; issuedAt: Date; gstCents?: number }>;
    distributions?: Array<{ agreementOutletId: string; percentage: number }>;
    outletProfiles?: Array<{ branchId: string; investmentCents: number | null }>;
  }) {
    const territoryFindMany = vi.fn(async (args: { where?: Record<string, unknown> }) => {
      const where = args.where as Record<string, unknown> | undefined;
      if (where?.id && typeof where.id === "object" && "in" in (where.id as Record<string, unknown>)) {
        const allowed = new Set((where.id as { in: string[] }).in);
        return input.territories.filter((territory) => allowed.has(territory.id));
      }
      return [];
    });

    const branchFindMany = vi.fn(async (args: { where?: Record<string, unknown> }) => {
      const where = args.where as Record<string, unknown> | undefined;
      if (where?.id && typeof where.id === "object" && "in" in (where.id as Record<string, unknown>)) {
        const allowed = new Set((where.id as { in: string[] }).in);
        return input.branches.filter((branch) => allowed.has(branch.id));
      }
      if (where?.territoryId && typeof where.territoryId === "object" && "in" in (where.territoryId as Record<string, unknown>)) {
        const allowed = new Set((where.territoryId as { in: string[] }).in);
        return input.branches.filter((branch) => allowed.has(branch.territoryId ?? ""));
      }
      return [];
    });

    const invoiceFindMany = vi.fn(async (args: { where?: Record<string, unknown> }) => {
      const where = args.where as Record<string, unknown> | undefined;
      const gte = (where?.issuedAt as { gte: Date } | undefined)?.gte;
      const lt = (where?.issuedAt as { lt: Date } | undefined)?.lt;
      let results = input.invoices;
      if (where?.branchId && typeof where.branchId === "object" && "in" in (where.branchId as Record<string, unknown>)) {
        const allowed = new Set((where.branchId as { in: string[] }).in);
        results = results.filter((invoice) => allowed.has(invoice.branchId));
      }
      if (gte) {
        results = results.filter((invoice) => invoice.issuedAt >= gte);
      }
      if (lt) {
        results = results.filter((invoice) => invoice.issuedAt < lt);
      }
      return results.map((invoice) => ({ ...invoice, gstCents: invoice.gstCents ?? 0 }));
    });

    function matchesAgreement(agreement: typeof input.agreements[0], where: Record<string, unknown> | undefined): boolean {
      if (!where) return true;
      if (where.tenantId && typeof where.tenantId === "string" && agreement.tenantId !== where.tenantId) return false;
      if (where.isActive === false) return false;
      if (where.partnerId && typeof where.partnerId === "object" && "in" in where.partnerId) {
        const allowed = new Set((where.partnerId as { in: string[] }).in);
        if (!allowed.has(agreement.partnerId)) return false;
      }
      if (where.partnerId && typeof where.partnerId === "string" && agreement.partnerId !== where.partnerId) return false;
      if (where.territoryId && typeof where.territoryId === "object" && "in" in where.territoryId) {
        const allowed = new Set((where.territoryId as { in: string[] }).in);
        if (!allowed.has(agreement.territoryId)) return false;
      }
      if (where.startDate && typeof where.startDate === "object" && "lte" in where.startDate) {
        const maxDate = (where.startDate as { lte: Date }).lte;
        if (agreement.startDate > maxDate) return false;
      }
      if (where.OR && Array.isArray(where.OR)) {
        const orClauses = where.OR as Array<Record<string, unknown>>;
        const matchesOr = orClauses.some((clause) => {
          if (clause.endDate === null && agreement.endDate === null) return true;
          if (clause.endDate && typeof clause.endDate === "object" && "gte" in clause.endDate) {
            const minDate = (clause.endDate as { gte: Date }).gte;
            return agreement.endDate !== null && agreement.endDate >= minDate;
          }
          return false;
        });
        if (!matchesOr) return false;
      }
      return true;
    }

    const partnerFindMany = vi.fn(async () => input.partners.map((partner) => ({ id: partner.id, name: partner.name })));
    const partnerFindFirst = vi.fn(async (args: { where?: Record<string, unknown> }) => {
      const where = args.where as Record<string, unknown> | undefined;
      if (where?.userId && typeof where.userId === "string") {
        const partner = input.partners.find((p) => p.userId === where.userId);
        return partner ? { id: partner.id, name: partner.name } : null;
      }
      return null;
    });

    const distributionFindMany = vi.fn(async (args: { where?: Record<string, unknown>; select?: Record<string, unknown> }) => {
      const where = args.where as Record<string, unknown> | undefined;
      const agreementOutletIds = (where?.agreementOutletId as { in: string[] } | undefined)?.in ?? [];
      let results = input.distributions ?? [];
      if (agreementOutletIds.length > 0) {
        const allowed = new Set(agreementOutletIds);
        results = results.filter((distribution) => allowed.has(distribution.agreementOutletId));
      }
      if (args.select && typeof args.select === "object") {
        return results.map((distribution) => ({
          agreementOutletId: distribution.agreementOutletId,
          percentage: distribution.percentage,
        }));
      }
      return results;
    });

    return {
      territory: { findMany: territoryFindMany },
      branch: { findMany: branchFindMany },
      franchisePartner: {
        findMany: partnerFindMany,
        findFirst: partnerFindFirst,
      },
      franchiseAgreement: {
        findMany: vi.fn(async (args: { where?: Record<string, unknown>; include?: Record<string, unknown>; select?: Record<string, unknown> }) => {
          const results = input.agreements.filter((agreement) => matchesAgreement(agreement, args.where));
          if (args.select && typeof args.select === "object") {
            if ("partnerId" in args.select && !("territoryId" in args.select)) {
              return results.map((agreement) => ({ partnerId: agreement.partnerId }));
            }
            if ("partnerId" in args.select && "territoryId" in args.select) {
              return results.map((agreement) => ({ partnerId: agreement.partnerId, territoryId: agreement.territoryId }));
            }
          }
          return results.map((agreement) => ({
            id: agreement.id,
            partnerId: agreement.partnerId,
            territoryId: agreement.territoryId,
            startDate: agreement.startDate,
            endDate: agreement.endDate,
            minimumGuaranteeCents: agreement.minimumGuaranteeCents ?? null,
            mgFormulaRateBp: agreement.mgFormulaRateBp ?? null,
            partner: agreement.partner,
            territory: agreement.territory,
            outlets: agreement.outlets,
          }));
        }),
      },
      franchiseOutletProfile: {
        findMany: vi.fn(async () => (input.outletProfiles ?? []).map((profile) => ({
          branchId: profile.branchId,
          investmentCents: profile.investmentCents,
        }))),
      },
      franchiseRevenueDistribution: {
        findMany: distributionFindMany,
      },
      invoice: { findMany: invoiceFindMany },
    } as never;
  }

  it("returns empty payouts when no agreements exist", async () => {
    const prisma = createFranchisePrisma({
      partners: [],
      territories: [],
      branches: [],
      agreements: [],
      invoices: [],
    });
    const service = createReportService(prisma);

    const result = await service.getFranchisePayout({ tenantId: "tenant-1", year: 2026, month: 8 });

    expect(result.year).toBe(2026);
    expect(result.month).toBe(8);
    expect(result.payouts).toHaveLength(0);
  });

  it("returns empty payouts for user with no partner link", async () => {
    const prisma = createFranchisePrisma({
      partners: [],
      territories: [{ id: "territory-1", name: "Surat" }],
      branches: [{ id: "branch-1", name: "Main", territoryId: "territory-1" }],
      agreements: [],
      invoices: [],
    });
    const service = createReportService(prisma);

    const result = await service.getFranchisePayout({ tenantId: "tenant-1", userId: "user-1", year: 2026, month: 8 });

    expect(result.payouts).toHaveLength(0);
  });

  it("calculates revenue share at ₹50,000 → ₹15,000 payout", async () => {
    const prisma = createFranchisePrisma({
      partners: [{ id: "partner-1", userId: "user-1", name: "Kushwaha" }],
      territories: [{ id: "territory-1", name: "Surat" }],
      branches: [{ id: "branch-1", name: "Main", territoryId: "territory-1" }],
      agreements: [
        {
          id: "agreement-1",
          tenantId: "tenant-1",
          partnerId: "partner-1",
          territoryId: "territory-1",
          startDate: baseDate(1),
          endDate: null,
          partner: { id: "partner-1", name: "Kushwaha" },
          territory: { id: "territory-1", name: "Surat" },
          outlets: [
            {
              id: "outlet-1",
              branchId: "branch-1",
              branch: { id: "branch-1", name: "Main", territoryId: "territory-1" },
            },
          ],
        },
      ],
      invoices: [
        { branchId: "branch-1", totalCents: 5000000, issuedAt: baseDate(5) },
      ],
      distributions: [
        { agreementOutletId: "outlet-1", percentage: 20 },
      ],
    });
    const service = createReportService(prisma);

    const result = await service.getFranchisePayout({ tenantId: "tenant-1", year: 2026, month: 8 });

    expect(result.payouts).toHaveLength(1);
    expect(result.payouts[0]!.agreementPayouts[0]).toMatchObject({
      grossRevenueCents: 5000000,
      revenueShareCents: 1000000,
      eligibleRevenueSharePayoutCents: 1500000,
    });
    expect(result.payouts[0]!.totalRevenueSharePayoutCents).toBe(1500000);
  });

  it("calculates revenue share at ₹75,000 → ₹15,000 payout", async () => {
    const prisma = createFranchisePrisma({
      partners: [{ id: "partner-1", userId: "user-1", name: "Kushwaha" }],
      territories: [{ id: "territory-1", name: "Surat" }],
      branches: [{ id: "branch-1", name: "Main", territoryId: "territory-1" }],
      agreements: [
        {
          id: "agreement-1",
          tenantId: "tenant-1",
          partnerId: "partner-1",
          territoryId: "territory-1",
          startDate: baseDate(1),
          endDate: null,
          partner: { id: "partner-1", name: "Kushwaha" },
          territory: { id: "territory-1", name: "Surat" },
          outlets: [
            {
              id: "outlet-1",
              branchId: "branch-1",
              branch: { id: "branch-1", name: "Main", territoryId: "territory-1" },
            },
          ],
        },
      ],
      invoices: [
        { branchId: "branch-1", totalCents: 7500000, issuedAt: baseDate(5) },
      ],
      distributions: [
        { agreementOutletId: "outlet-1", percentage: 20 },
      ],
    });
    const service = createReportService(prisma);

    const result = await service.getFranchisePayout({ tenantId: "tenant-1", year: 2026, month: 8 });

    expect(result.payouts[0]!.agreementPayouts[0]).toMatchObject({
      grossRevenueCents: 7500000,
      revenueShareCents: 1500000,
      eligibleRevenueSharePayoutCents: 2250000,
    });
  });

  it("calculates revenue share at ₹80,000 → ₹24,000 payout (30% of Net Sales)", async () => {
    const prisma = createFranchisePrisma({
      partners: [{ id: "partner-1", userId: "user-1", name: "Kushwaha" }],
      territories: [{ id: "territory-1", name: "Surat" }],
      branches: [{ id: "branch-1", name: "Main", territoryId: "territory-1" }],
      agreements: [
        {
          id: "agreement-1",
          tenantId: "tenant-1",
          partnerId: "partner-1",
          territoryId: "territory-1",
          startDate: baseDate(1),
          endDate: null,
          partner: { id: "partner-1", name: "Kushwaha" },
          territory: { id: "territory-1", name: "Surat" },
          outlets: [
            {
              id: "outlet-1",
              branchId: "branch-1",
              branch: { id: "branch-1", name: "Main", territoryId: "territory-1" },
            },
          ],
        },
      ],
      invoices: [
        { branchId: "branch-1", totalCents: 8000000, issuedAt: baseDate(5) },
      ],
      distributions: [
        { agreementOutletId: "outlet-1", percentage: 20 },
      ],
    });
    const service = createReportService(prisma);

    const result = await service.getFranchisePayout({ tenantId: "tenant-1", year: 2026, month: 8 });

    expect(result.payouts[0]!.agreementPayouts[0]).toMatchObject({
      grossRevenueCents: 8000000,
      revenueShareCents: 1600000,
      eligibleRevenueSharePayoutCents: 2400000,
    });
    expect(result.payouts[0]!.totalRevenueSharePayoutCents).toBe(2400000);
  });

  it("calculates revenue share at ₹100,000 → ₹30,000 payout (30% of Net Sales)", async () => {
    const prisma = createFranchisePrisma({
      partners: [{ id: "partner-1", userId: "user-1", name: "Kushwaha" }],
      territories: [{ id: "territory-1", name: "Surat" }],
      branches: [{ id: "branch-1", name: "Main", territoryId: "territory-1" }],
      agreements: [
        {
          id: "agreement-1",
          tenantId: "tenant-1",
          partnerId: "partner-1",
          territoryId: "territory-1",
          startDate: baseDate(1),
          endDate: null,
          partner: { id: "partner-1", name: "Kushwaha" },
          territory: { id: "territory-1", name: "Surat" },
          outlets: [
            {
              id: "outlet-1",
              branchId: "branch-1",
              branch: { id: "branch-1", name: "Main", territoryId: "territory-1" },
            },
          ],
        },
      ],
      invoices: [
        { branchId: "branch-1", totalCents: 10000000, issuedAt: baseDate(5) },
      ],
      distributions: [
        { agreementOutletId: "outlet-1", percentage: 20 },
      ],
    });
    const service = createReportService(prisma);

    const result = await service.getFranchisePayout({ tenantId: "tenant-1", year: 2026, month: 8 });

    expect(result.payouts[0]!.agreementPayouts[0]).toMatchObject({
      grossRevenueCents: 10000000,
      revenueShareCents: 2000000,
      eligibleRevenueSharePayoutCents: 3000000,
    });
  });

  it("uses agreement-level minimumGuaranteeCents when set", async () => {
    const prisma = createFranchisePrisma({
      partners: [{ id: "partner-1", userId: "user-1", name: "Kushwaha" }],
      territories: [{ id: "territory-1", name: "Surat" }],
      branches: [{ id: "branch-1", name: "Main", territoryId: "territory-1" }],
      agreements: [
        {
          id: "agreement-1",
          tenantId: "tenant-1",
          partnerId: "partner-1",
          territoryId: "territory-1",
          startDate: baseDate(1),
          endDate: null,
          minimumGuaranteeCents: 2000000,
          partner: { id: "partner-1", name: "Kushwaha" },
          territory: { id: "territory-1", name: "Surat" },
          outlets: [
            {
              id: "outlet-1",
              branchId: "branch-1",
              branch: { id: "branch-1", name: "Main", territoryId: "territory-1" },
            },
          ],
        },
      ],
      invoices: [
        { branchId: "branch-1", totalCents: 5000000, issuedAt: baseDate(5) },
      ],
      distributions: [
        { agreementOutletId: "outlet-1", percentage: 20 },
      ],
    });
    const service = createReportService(prisma);

    const result = await service.getFranchisePayout({ tenantId: "tenant-1", year: 2026, month: 8 });

    expect(result.payouts[0]!.agreementPayouts[0]).toMatchObject({
      grossRevenueCents: 5000000,
      revenueShareCents: 1000000,
      eligibleRevenueSharePayoutCents: 2000000,
    });
    expect(result.payouts[0]!.totalRevenueSharePayoutCents).toBe(2000000);
  });

  it("falls back to 1500000 MG when minimumGuaranteeCents is null", async () => {
    const prisma = createFranchisePrisma({
      partners: [{ id: "partner-1", userId: "user-1", name: "Kushwaha" }],
      territories: [{ id: "territory-1", name: "Surat" }],
      branches: [{ id: "branch-1", name: "Main", territoryId: "territory-1" }],
      agreements: [
        {
          id: "agreement-1",
          tenantId: "tenant-1",
          partnerId: "partner-1",
          territoryId: "territory-1",
          startDate: baseDate(1),
          endDate: null,
          minimumGuaranteeCents: null,
          partner: { id: "partner-1", name: "Kushwaha" },
          territory: { id: "territory-1", name: "Surat" },
          outlets: [
            {
              id: "outlet-1",
              branchId: "branch-1",
              branch: { id: "branch-1", name: "Main", territoryId: "territory-1" },
            },
          ],
        },
      ],
      invoices: [
        { branchId: "branch-1", totalCents: 5000000, issuedAt: baseDate(5) },
      ],
      distributions: [
        { agreementOutletId: "outlet-1", percentage: 20 },
      ],
    });
    const service = createReportService(prisma);

    const result = await service.getFranchisePayout({ tenantId: "tenant-1", year: 2026, month: 8 });

    expect(result.payouts[0]!.agreementPayouts[0]).toMatchObject({
      eligibleRevenueSharePayoutCents: 1500000,
    });
  });

  it("calculates formula-based MG at 3% of investment (MG-02)", async () => {
    const prisma = createFranchisePrisma({
      partners: [{ id: "partner-1", userId: "user-1", name: "Kushwaha" }],
      territories: [{ id: "territory-1", name: "Surat" }],
      branches: [{ id: "branch-1", name: "Main", territoryId: "territory-1" }],
      agreements: [
        {
          id: "agreement-1",
          tenantId: "tenant-1",
          partnerId: "partner-1",
          territoryId: "territory-1",
          startDate: baseDate(1),
          endDate: null,
          mgFormulaRateBp: 300,
          partner: { id: "partner-1", name: "Kushwaha" },
          territory: { id: "territory-1", name: "Surat" },
          outlets: [
            {
              id: "outlet-1",
              branchId: "branch-1",
              branch: { id: "branch-1", name: "Main", territoryId: "territory-1" },
            },
          ],
        },
      ],
      invoices: [
        { branchId: "branch-1", totalCents: 5000000, issuedAt: baseDate(5) },
      ],
      distributions: [
        { agreementOutletId: "outlet-1", percentage: 20 },
      ],
      outletProfiles: [
        { branchId: "branch-1", investmentCents: 1000000 },
      ],
    });
    const service = createReportService(prisma);

    const result = await service.getFranchisePayout({ tenantId: "tenant-1", year: 2026, month: 8 });

    expect(result.payouts[0]!.agreementPayouts[0]).toMatchObject({
      grossRevenueCents: 5000000,
      revenueShareCents: 1000000,
      eligibleRevenueSharePayoutCents: 30000,
    });
    expect(result.payouts[0]!.totalRevenueSharePayoutCents).toBe(30000);
  });

  it("uses agreement-level mgFormulaRateBp not hardcoded 3%", async () => {
    const prisma = createFranchisePrisma({
      partners: [{ id: "partner-1", userId: "user-1", name: "Kushwaha" }],
      territories: [{ id: "territory-1", name: "Surat" }],
      branches: [{ id: "branch-1", name: "Main", territoryId: "territory-1" }],
      agreements: [
        {
          id: "agreement-1",
          tenantId: "tenant-1",
          partnerId: "partner-1",
          territoryId: "territory-1",
          startDate: baseDate(1),
          endDate: null,
          mgFormulaRateBp: 500,
          partner: { id: "partner-1", name: "Kushwaha" },
          territory: { id: "territory-1", name: "Surat" },
          outlets: [
            {
              id: "outlet-1",
              branchId: "branch-1",
              branch: { id: "branch-1", name: "Main", territoryId: "territory-1" },
            },
          ],
        },
      ],
      invoices: [
        { branchId: "branch-1", totalCents: 5000000, issuedAt: baseDate(5) },
      ],
      distributions: [
        { agreementOutletId: "outlet-1", percentage: 20 },
      ],
      outletProfiles: [
        { branchId: "branch-1", investmentCents: 1000000 },
      ],
    });
    const service = createReportService(prisma);

    const result = await service.getFranchisePayout({ tenantId: "tenant-1", year: 2026, month: 8 });

    expect(result.payouts[0]!.agreementPayouts[0]).toMatchObject({
      eligibleRevenueSharePayoutCents: 50000,
    });
  });

  it("formula MG flows into NP-02 higher-of calculation", async () => {
    const prisma = createFranchisePrisma({
      partners: [{ id: "partner-1", userId: "user-1", name: "Kushwaha" }],
      territories: [{ id: "territory-1", name: "Surat" }],
      branches: [{ id: "branch-1", name: "Main", territoryId: "territory-1" }],
      agreements: [
        {
          id: "agreement-1",
          tenantId: "tenant-1",
          partnerId: "partner-1",
          territoryId: "territory-1",
          startDate: baseDate(1),
          endDate: null,
          mgFormulaRateBp: 300,
          partner: { id: "partner-1", name: "Kushwaha" },
          territory: { id: "territory-1", name: "Surat" },
          outlets: [
            {
              id: "outlet-1",
              branchId: "branch-1",
              branch: { id: "branch-1", name: "Main", territoryId: "territory-1" },
            },
          ],
        },
      ],
      invoices: [
        { branchId: "branch-1", totalCents: 50000000, issuedAt: baseDate(5) },
      ],
      distributions: [
        { agreementOutletId: "outlet-1", percentage: 20 },
      ],
      outletProfiles: [
        { branchId: "branch-1", investmentCents: 10000000 },
      ],
    });
    const service = createReportService(prisma);

    const result = await service.getFranchisePayout({ tenantId: "tenant-1", year: 2026, month: 8 });

    const formulaMG = Math.round((10000000 * 300) / 10000);
    const netSales30 = Math.round(50000000 * 0.30);
    expect(formulaMG).toBe(300000);
    expect(netSales30).toBe(15000000);
    expect(result.payouts[0]!.agreementPayouts[0]).toMatchObject({
      grossRevenueCents: 50000000,
      eligibleRevenueSharePayoutCents: 15000000,
    });
  });

  it("variable payout > formula MG when 30% net sales exceeds formula MG", async () => {
    const prisma = createFranchisePrisma({
      partners: [{ id: "partner-1", userId: "user-1", name: "Kushwaha" }],
      territories: [{ id: "territory-1", name: "Surat" }],
      branches: [{ id: "branch-1", name: "Main", territoryId: "territory-1" }],
      agreements: [
        {
          id: "agreement-1",
          tenantId: "tenant-1",
          partnerId: "partner-1",
          territoryId: "territory-1",
          startDate: baseDate(1),
          endDate: null,
          mgFormulaRateBp: 300,
          partner: { id: "partner-1", name: "Kushwaha" },
          territory: { id: "territory-1", name: "Surat" },
          outlets: [
            {
              id: "outlet-1",
              branchId: "branch-1",
              branch: { id: "branch-1", name: "Main", territoryId: "territory-1" },
            },
          ],
        },
      ],
      invoices: [
        { branchId: "branch-1", totalCents: 2000000, issuedAt: baseDate(5) },
      ],
      distributions: [
        { agreementOutletId: "outlet-1", percentage: 20 },
      ],
      outletProfiles: [
        { branchId: "branch-1", investmentCents: 500000 },
      ],
    });
    const service = createReportService(prisma);

    const result = await service.getFranchisePayout({ tenantId: "tenant-1", year: 2026, month: 8 });

    const formulaMG = Math.round((500000 * 300) / 10000);
    const netSales30 = Math.round(2000000 * 0.30);
    expect(formulaMG).toBe(15000);
    expect(netSales30).toBe(600000);
    expect(result.payouts[0]!.agreementPayouts[0]).toMatchObject({
      eligibleRevenueSharePayoutCents: 600000,
    });
  });

  it("excludes GST from sales (Net Sales = totalCents - gstCents)", async () => {
    const prisma = createFranchisePrisma({
      partners: [{ id: "partner-1", userId: "user-1", name: "Kushwaha" }],
      territories: [{ id: "territory-1", name: "Surat" }],
      branches: [{ id: "branch-1", name: "Main", territoryId: "territory-1" }],
      agreements: [
        {
          id: "agreement-1",
          tenantId: "tenant-1",
          partnerId: "partner-1",
          territoryId: "territory-1",
          startDate: baseDate(1),
          endDate: null,
          partner: { id: "partner-1", name: "Kushwaha" },
          territory: { id: "territory-1", name: "Surat" },
          outlets: [
            {
              id: "outlet-1",
              branchId: "branch-1",
              branch: { id: "branch-1", name: "Main", territoryId: "territory-1" },
            },
          ],
        },
      ],
      invoices: [
        { branchId: "branch-1", totalCents: 10000000, issuedAt: baseDate(5), gstCents: 1500000 },
      ],
      distributions: [
        { agreementOutletId: "outlet-1", percentage: 20 },
      ],
    });
    const service = createReportService(prisma);

    const result = await service.getFranchisePayout({ tenantId: "tenant-1", year: 2026, month: 8 });

    expect(result.payouts).toHaveLength(1);
    expect(result.payouts[0]!.agreementPayouts[0]).toMatchObject({
      grossRevenueCents: 8500000,
      revenueShareCents: 1700000,
      eligibleRevenueSharePayoutCents: 2550000,
    });
  });

  it("calculates territory royalty pool and divides equally among partners", async () => {
    const prisma = createFranchisePrisma({
      partners: [
        { id: "partner-1", userId: "user-1", name: "Kushwaha" },
        { id: "partner-2", userId: "user-2", name: "HUF" },
      ],
      territories: [
        { id: "territory-1", name: "Surat" },
      ],
      branches: [
        { id: "branch-1", name: "Main", territoryId: "territory-1" },
        { id: "branch-2", name: "North", territoryId: "territory-1" },
      ],
      agreements: [
        {
          id: "agreement-1",
          tenantId: "tenant-1",
          partnerId: "partner-1",
          territoryId: "territory-1",
          startDate: baseDate(1),
          endDate: null,
          partner: { id: "partner-1", name: "Kushwaha" },
          territory: { id: "territory-1", name: "Surat" },
          outlets: [
            {
              id: "outlet-1",
              branchId: "branch-1",
              branch: { id: "branch-1", name: "Main", territoryId: "territory-1" },
            },
          ],
        },
        {
          id: "agreement-2",
          tenantId: "tenant-1",
          partnerId: "partner-2",
          territoryId: "territory-1",
          startDate: baseDate(1),
          endDate: null,
          partner: { id: "partner-2", name: "HUF" },
          territory: { id: "territory-1", name: "Surat" },
          outlets: [
            {
              id: "outlet-2",
              branchId: "branch-2",
              branch: { id: "branch-2", name: "North", territoryId: "territory-1" },
            },
          ],
        },
      ],
      invoices: [
        { branchId: "branch-1", totalCents: 400000, issuedAt: baseDate(5) },
        { branchId: "branch-2", totalCents: 600000, issuedAt: baseDate(6) },
      ],
      distributions: [
        { agreementOutletId: "outlet-1", percentage: 20 },
        { agreementOutletId: "outlet-2", percentage: 20 },
      ],
    });
    const service = createReportService(prisma);

    const result = await service.getFranchisePayout({ tenantId: "tenant-1", year: 2026, month: 8 });

    expect(result.payouts).toHaveLength(2);
    const territoryRoyalty = result.payouts[0]!.territoryRoyalties[0]!;
    expect(territoryRoyalty.territorySalesTurnoverCents).toBe(1000000);
    expect(territoryRoyalty.royaltyPoolCents).toBe(20000);
    expect(territoryRoyalty.eligiblePartnerCount).toBe(2);
    expect(territoryRoyalty.individualRoyaltyCents).toBe(10000);
    expect(result.payouts[0]!.totalTerritoryRoyaltyCents).toBe(10000);
    expect(result.payouts[1]!.totalTerritoryRoyaltyCents).toBe(10000);
  });

  it("calculates territory royalty with 4 partners equally", async () => {
    const partners = [
      { id: "partner-1", userId: "user-1", name: "Partner 1" },
      { id: "partner-2", userId: "user-2", name: "Partner 2" },
      { id: "partner-3", userId: "user-3", name: "Partner 3" },
      { id: "partner-4", userId: "user-4", name: "Partner 4" },
    ];
    const branches = [
      { id: "branch-1", name: "Main", territoryId: "territory-1" },
      { id: "branch-2", name: "North", territoryId: "territory-1" },
      { id: "branch-3", name: "South", territoryId: "territory-1" },
      { id: "branch-4", name: "East", territoryId: "territory-1" },
    ];
    const agreements = partners.map((partner, index) => ({
      id: `agreement-${index + 1}`,
      tenantId: "tenant-1",
      partnerId: partner.id,
      territoryId: "territory-1",
      startDate: baseDate(1),
      endDate: null,
      partner,
      territory: { id: "territory-1", name: "Surat" },
      outlets: [
        {
          id: `outlet-${index + 1}`,
          branchId: branches[index]!.id,
          branch: branches[index]!,
        },
      ],
    }));
    const invoices = branches.map((branch) => ({
      branchId: branch.id,
      totalCents: 250000,
      issuedAt: baseDate(5),
    }));

    const prisma = createFranchisePrisma({
      partners,
      territories: [{ id: "territory-1", name: "Surat" }],
      branches,
      agreements,
      invoices,
      distributions: partners.map((_, index) => ({
        agreementOutletId: `outlet-${index + 1}`,
        percentage: 20,
      })),
    });
    const service = createReportService(prisma);

    const result = await service.getFranchisePayout({ tenantId: "tenant-1", year: 2026, month: 8 });

    expect(result.payouts).toHaveLength(4);
    const territoryRoyalty = result.payouts[0]!.territoryRoyalties[0]!;
    expect(territoryRoyalty.territorySalesTurnoverCents).toBe(1000000);
    expect(territoryRoyalty.royaltyPoolCents).toBe(20000);
    expect(territoryRoyalty.eligiblePartnerCount).toBe(4);
    expect(territoryRoyalty.individualRoyaltyCents).toBe(5000);
    expect(result.payouts[0]!.totalTerritoryRoyaltyCents).toBe(5000);
  });

  it("scopes payout to requesting user when userId is provided", async () => {
    const prisma = createFranchisePrisma({
      partners: [
        { id: "partner-1", userId: "user-1", name: "Kushwaha" },
        { id: "partner-2", userId: "user-2", name: "HUF" },
      ],
      territories: [{ id: "territory-1", name: "Surat" }],
      branches: [
        { id: "branch-1", name: "Main", territoryId: "territory-1" },
        { id: "branch-2", name: "North", territoryId: "territory-1" },
      ],
      agreements: [
        {
          id: "agreement-1",
          tenantId: "tenant-1",
          partnerId: "partner-1",
          territoryId: "territory-1",
          startDate: baseDate(1),
          endDate: null,
          partner: { id: "partner-1", name: "Kushwaha" },
          territory: { id: "territory-1", name: "Surat" },
          outlets: [
            {
              id: "outlet-1",
              branchId: "branch-1",
              branch: { id: "branch-1", name: "Main", territoryId: "territory-1" },
            },
          ],
        },
        {
          id: "agreement-2",
          tenantId: "tenant-1",
          partnerId: "partner-2",
          territoryId: "territory-1",
          startDate: baseDate(1),
          endDate: null,
          partner: { id: "partner-2", name: "HUF" },
          territory: { id: "territory-1", name: "Surat" },
          outlets: [
            {
              id: "outlet-2",
              branchId: "branch-2",
              branch: { id: "branch-2", name: "North", territoryId: "territory-1" },
            },
          ],
        },
      ],
      invoices: [
        { branchId: "branch-1", totalCents: 8000000, issuedAt: baseDate(5) },
        { branchId: "branch-2", totalCents: 2000000, issuedAt: baseDate(6) },
      ],
      distributions: [
        { agreementOutletId: "outlet-1", percentage: 20 },
        { agreementOutletId: "outlet-2", percentage: 20 },
      ],
    });
    const service = createReportService(prisma);

    const result = await service.getFranchisePayout({ tenantId: "tenant-1", userId: "user-1", year: 2026, month: 8 });

    expect(result.payouts).toHaveLength(1);
    expect(result.payouts[0]!.partnerId).toBe("partner-1");
    expect(result.payouts[0]!.agreementPayouts[0]!.grossRevenueCents).toBe(8000000);
    expect(result.payouts[0]!.totalEligiblePayoutCents).toBe(1600000 + 100000);
  });

  it("denies cross-partner payout access when userId belongs to a different partner", async () => {
    const prisma = createFranchisePrisma({
      partners: [
        { id: "partner-1", userId: "user-1", name: "Kushwaha" },
        { id: "partner-2", userId: "user-2", name: "HUF" },
      ],
      territories: [{ id: "territory-1", name: "Surat" }],
      branches: [
        { id: "branch-1", name: "Main", territoryId: "territory-1" },
        { id: "branch-2", name: "North", territoryId: "territory-1" },
      ],
      agreements: [
        {
          id: "agreement-1",
          tenantId: "tenant-1",
          partnerId: "partner-1",
          territoryId: "territory-1",
          startDate: baseDate(1),
          endDate: null,
          partner: { id: "partner-1", name: "Kushwaha" },
          territory: { id: "territory-1", name: "Surat" },
          outlets: [
            {
              id: "outlet-1",
              branchId: "branch-1",
              branch: { id: "branch-1", name: "Main", territoryId: "territory-1" },
            },
          ],
        },
        {
          id: "agreement-2",
          tenantId: "tenant-1",
          partnerId: "partner-2",
          territoryId: "territory-1",
          startDate: baseDate(1),
          endDate: null,
          partner: { id: "partner-2", name: "HUF" },
          territory: { id: "territory-1", name: "Surat" },
          outlets: [
            {
              id: "outlet-2",
              branchId: "branch-2",
              branch: { id: "branch-2", name: "North", territoryId: "territory-1" },
            },
          ],
        },
      ],
      invoices: [
        { branchId: "branch-1", totalCents: 8000000, issuedAt: baseDate(5) },
        { branchId: "branch-2", totalCents: 2000000, issuedAt: baseDate(6) },
      ],
      distributions: [
        { agreementOutletId: "outlet-1", percentage: 20 },
        { agreementOutletId: "outlet-2", percentage: 20 },
      ],
    });
    const service = createReportService(prisma);

    const result = await service.getFranchisePayout({ tenantId: "tenant-1", userId: "user-2", year: 2026, month: 8 });

    expect(result.payouts).toHaveLength(1);
    expect(result.payouts[0]!.partnerId).toBe("partner-2");
    expect(result.payouts[0]!.agreementPayouts[0]!.grossRevenueCents).toBe(2000000);
    expect(result.payouts[0]!.agreementPayouts[0]!.revenueShareCents).toBe(400000);
    expect(result.payouts[0]!.agreementPayouts[0]!.eligibleRevenueSharePayoutCents).toBe(1500000);
    expect(result.payouts[0]!.totalRevenueSharePayoutCents).toBe(1500000);
    expect(result.payouts[0]!.territoryRoyalties[0]!.individualRoyaltyCents).toBe(100000);
    expect(result.payouts[0]!.totalEligiblePayoutCents).toBe(1600000);
  });

  it("returns zero royalty when no eligible partners exist", async () => {
    const prisma = createFranchisePrisma({
      partners: [],
      territories: [{ id: "territory-1", name: "Surat" }],
      branches: [{ id: "branch-1", name: "Main", territoryId: "territory-1" }],
      agreements: [],
      invoices: [
        { branchId: "branch-1", totalCents: 500000, issuedAt: baseDate(5) },
      ],
    });
    const service = createReportService(prisma);

    const result = await service.getFranchisePayout({ tenantId: "tenant-1", year: 2026, month: 8 });

    expect(result.payouts).toHaveLength(0);
  });

  it("calculates zero revenue correctly", async () => {
    const prisma = createFranchisePrisma({
      partners: [{ id: "partner-1", userId: "user-1", name: "Kushwaha" }],
      territories: [{ id: "territory-1", name: "Surat" }],
      branches: [{ id: "branch-1", name: "Main", territoryId: "territory-1" }],
      agreements: [
        {
          id: "agreement-1",
          tenantId: "tenant-1",
          partnerId: "partner-1",
          territoryId: "territory-1",
          startDate: baseDate(1),
          endDate: null,
          partner: { id: "partner-1", name: "Kushwaha" },
          territory: { id: "territory-1", name: "Surat" },
          outlets: [
            {
              id: "outlet-1",
              branchId: "branch-1",
              branch: { id: "branch-1", name: "Main", territoryId: "territory-1" },
            },
          ],
        },
      ],
      invoices: [],
      distributions: [
        { agreementOutletId: "outlet-1", percentage: 20 },
      ],
    });
    const service = createReportService(prisma);

    const result = await service.getFranchisePayout({ tenantId: "tenant-1", year: 2026, month: 8 });

    expect(result.payouts[0]!.agreementPayouts[0]).toMatchObject({
      grossRevenueCents: 0,
      revenueShareCents: 0,
      eligibleRevenueSharePayoutCents: 1500000,
    });
    expect(result.payouts[0]!.totalRevenueSharePayoutCents).toBe(1500000);
  });
});

describe("report service: getInventoryStockReport", () => {
  it("returns empty array when no stock items exist", async () => {
    const prisma = createPrisma([], [], [], [], [], [], []);
    const service = createReportService(prisma);

    const report = await service.getInventoryStockReport({ tenantId: "tenant-1" });

    expect(report).toHaveLength(0);
  });

  it("returns stock items with product and branch names", async () => {
    const prisma = createPrisma(
      [],
      [],
      [],
      [],
      [{ id: "branch-1", name: "Main Branch" }],
      [
        { id: "si-1", productId: "p1", branchId: "branch-1", quantity: 10, createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-02") },
      ],
      [{ id: "p1", name: "Product 1" }],
    );
    const service = createReportService(prisma);

    const report = await service.getInventoryStockReport({ tenantId: "tenant-1" });

    expect(report).toHaveLength(1);
    expect(report[0]).toMatchObject({
      stockItemId: "si-1",
      productId: "p1",
      productName: "Product 1",
      branchId: "branch-1",
      branchName: "Main Branch",
      quantity: 10,
    });
  });

  it("filters stock items by branchId when provided", async () => {
    const prisma = createPrisma(
      [],
      [],
      [],
      [],
      [
        { id: "branch-1", name: "Main Branch" },
        { id: "branch-2", name: "Second Branch" },
      ],
      [
        { id: "si-1", productId: "p1", branchId: "branch-1", quantity: 10, createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-02") },
        { id: "si-2", productId: "p2", branchId: "branch-2", quantity: 5, createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-02") },
      ],
      [
        { id: "p1", name: "Product 1" },
        { id: "p2", name: "Product 2" },
      ],
    );
    const service = createReportService(prisma);

    const report = await service.getInventoryStockReport({ tenantId: "tenant-1", branchId: "branch-1" });

    expect(report).toHaveLength(1);
    expect(report[0]).toMatchObject({
      stockItemId: "si-1",
      productId: "p1",
      branchId: "branch-1",
    });
  });

  it("falls back to 'Unknown' when product or branch is missing", async () => {
    const prisma = createPrisma(
      [],
      [],
      [],
      [],
      [],
      [
        { id: "si-1", productId: "missing-product", branchId: "missing-branch", quantity: 10, createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-02") },
      ],
      [],
    );
    const service = createReportService(prisma);

    const report = await service.getInventoryStockReport({ tenantId: "tenant-1" });

    expect(report).toHaveLength(1);
    expect(report[0]).toMatchObject({
      productName: "Unknown",
      branchName: "Unknown",
    });
  });
});
