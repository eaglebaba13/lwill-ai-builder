export interface ReportSummaryRecord {
  readonly sales: {
    readonly invoiceCount: number;
    readonly totalRevenueCents: number;
  };
  readonly appointments: {
    readonly total: number;
    readonly statusBreakdown: ReadonlyArray<{
      readonly status: string;
      readonly count: number;
    }>;
  };
  readonly customers: {
    readonly total: number;
  };
  readonly inventory: {
    readonly stockItemCount: number;
    readonly totalQuantity: number;
    readonly movementCount: number;
  };
}

export interface ReportService {
  getReportSummary(args: { tenantId: string }): Promise<ReportSummaryRecord>;
  listDailySales(args: { tenantId: string }): Promise<ReadonlyArray<{
    readonly date: string;
    readonly invoiceCount: number;
    readonly totalRevenueCents: number;
  }>>;
  listAppointmentReport(args: { tenantId: string }): Promise<ReadonlyArray<{
    readonly date: string;
    readonly appointmentCount: number;
    readonly statusBreakdown: ReadonlyArray<{
      readonly status: string;
      readonly count: number;
    }>;
  }>>;
  listMembershipReport(args: { tenantId: string }): Promise<ReadonlyArray<{
    readonly status: string;
    readonly count: number;
    readonly packageBreakdown: ReadonlyArray<{
      readonly packageId: string;
      readonly packageName: string;
      readonly count: number;
    }>;
  }>>;
  listPackageUtilizationReport(args: { tenantId: string }): Promise<ReadonlyArray<{
    readonly packageId: string;
    readonly packageName: string;
    readonly totalMemberships: number;
    readonly activeMemberships: number;
  }>>;
  getGstSummary(args: { tenantId: string }): Promise<{
    readonly totalGstCents: number;
    readonly totalTaxableCents: number;
    readonly invoiceCount: number;
  }>;
  listBranchPerformance(args: { tenantId: string }): Promise<ReadonlyArray<{
    readonly branchId: string;
    readonly branchName: string;
    readonly staffCount: number;
    readonly attendanceCount: number;
  }>>;
  getInventoryStockReport(args: { readonly tenantId: string; readonly branchId?: string }): Promise<ReadonlyArray<{
    readonly stockItemId: string;
    readonly productId: string;
    readonly productName: string;
    readonly branchId: string;
    readonly branchName: string;
    readonly quantity: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
  }>>;
}

interface ReportPrismaClient {
  readonly invoice: {
    findMany(args: { where?: Record<string, unknown>; select?: Record<string, unknown>; orderBy?: Record<string, unknown> }): Promise<ReadonlyArray<{ readonly totalCents: number; readonly issuedAt: Date; readonly gstCents: number; readonly subtotalCents: number }>>;
  };
  readonly appointment: {
    findMany(args: { where?: Record<string, unknown>; select?: Record<string, unknown>; orderBy?: Record<string, unknown> }): Promise<ReadonlyArray<{ readonly status: string; readonly startsAt: Date }>>;
  };
  readonly customer: {
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
  readonly stockItem: {
    count(args: { where: Record<string, unknown> }): Promise<number>;
    findMany(args: { where?: Record<string, unknown>; select?: Record<string, unknown> }): Promise<ReadonlyArray<{ readonly id: string; readonly quantity: number; readonly productId: string; readonly branchId: string; readonly createdAt: Date; readonly updatedAt: Date }>>;
  };
  readonly product: {
    findMany(args: { where?: Record<string, unknown>; select?: Record<string, unknown> }): Promise<ReadonlyArray<{ readonly id: string; readonly name: string }>>;
  };
  readonly stockMovement: {
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
  readonly package: {
    findMany(args: { where?: Record<string, unknown>; select?: Record<string, unknown> }): Promise<ReadonlyArray<{ readonly id: string; readonly name: string }>>;
  };
  readonly membership: {
    findMany(args: { where?: Record<string, unknown>; select?: Record<string, unknown> }): Promise<ReadonlyArray<{ readonly status: string; readonly packageId: string }>>;
  };
  readonly branch: {
    findMany(args: { where?: Record<string, unknown>; select?: Record<string, unknown> }): Promise<ReadonlyArray<{ readonly id: string; readonly name: string }>>;
  };
  readonly staff: {
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
  readonly attendance: {
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
}

export function createReportService(prisma: ReportPrismaClient): ReportService {
  return {
    async getReportSummary({ tenantId }) {
      const invoices = await prisma.invoice.findMany({
        where: { tenantId },
        select: { totalCents: true, issuedAt: true, gstCents: true, subtotalCents: true },
      });

      const appointments = await prisma.appointment.findMany({
        where: { tenantId },
        select: { status: true },
      });

      const customerCount = await prisma.customer.count({
        where: { tenantId },
      });

      const stockItems = await prisma.stockItem.findMany({
        where: { tenantId },
        select: { quantity: true },
      });

      const movementCount = await prisma.stockMovement.count({
        where: { tenantId },
      });

      const statusBreakdown = new Map<string, number>();
      for (const appointment of appointments) {
        const current = statusBreakdown.get(appointment.status) ?? 0;
        statusBreakdown.set(appointment.status, current + 1);
      }

      const totalRevenueCents = invoices.reduce((sum, invoice) => sum + invoice.totalCents, 0);
      const totalQuantity = stockItems.reduce((sum, item) => sum + item.quantity, 0);

      return {
        sales: {
          invoiceCount: invoices.length,
          totalRevenueCents,
        },
        appointments: {
          total: appointments.length,
          statusBreakdown: Array.from(statusBreakdown.entries()).map(([status, count]) => ({
            status,
            count,
          })),
        },
        customers: {
          total: customerCount,
        },
        inventory: {
          stockItemCount: stockItems.length,
          totalQuantity,
          movementCount,
        },
      };
    },

    async listDailySales({ tenantId }) {
      const invoices = await prisma.invoice.findMany({
        where: { tenantId },
        select: { totalCents: true, issuedAt: true },
        orderBy: { issuedAt: "asc" },
      });

      const dailyMap = new Map<string, { invoiceCount: number; totalRevenueCents: number }>();
      for (const invoice of invoices) {
        const dateKey = new Date(invoice.issuedAt).toISOString().slice(0, 10);
        const current = dailyMap.get(dateKey) ?? { invoiceCount: 0, totalRevenueCents: 0 };
        dailyMap.set(dateKey, {
          invoiceCount: current.invoiceCount + 1,
          totalRevenueCents: current.totalRevenueCents + invoice.totalCents,
        });
      }

      return Array.from(dailyMap.entries()).map(([date, values]) => ({
        date,
        ...values,
      }));
    },

    async listAppointmentReport({ tenantId }) {
      const appointments = await prisma.appointment.findMany({
        where: { tenantId },
        select: { startsAt: true, status: true },
        orderBy: { startsAt: "asc" },
      });

      const dateMap = new Map<string, { appointmentCount: number; statusBreakdown: Map<string, number> }>();
      for (const appointment of appointments) {
        const dateKey = new Date(appointment.startsAt).toISOString().slice(0, 10);
        const entry = dateMap.get(dateKey) ?? { appointmentCount: 0, statusBreakdown: new Map() };
        entry.appointmentCount += 1;
        const current = entry.statusBreakdown.get(appointment.status) ?? 0;
        entry.statusBreakdown.set(appointment.status, current + 1);
        dateMap.set(dateKey, entry);
      }

      return Array.from(dateMap.entries()).map(([date, entry]) => ({
        date,
        appointmentCount: entry.appointmentCount,
        statusBreakdown: Array.from(entry.statusBreakdown.entries()).map(([status, count]) => ({
          status,
          count,
        })),
      }));
    },

    async listMembershipReport({ tenantId }) {
      const [memberships, packages] = await Promise.all([
        prisma.membership.findMany({
          where: { tenantId },
          select: { status: true, packageId: true },
        }),
        prisma.package.findMany({
          where: { tenantId },
          select: { id: true, name: true },
        }),
      ]);

      const packageMap = new Map(packages.map((pkg) => [pkg.id, pkg.name]));

      const statusMap = new Map<string, { count: number; packageMap: Map<string, number> }>();
      for (const membership of memberships) {
        const entry = statusMap.get(membership.status) ?? { count: 0, packageMap: new Map() };
        entry.count += 1;
        const pkgName = packageMap.get(membership.packageId) ?? "Unknown";
        const current = entry.packageMap.get(pkgName) ?? 0;
        entry.packageMap.set(pkgName, current + 1);
        statusMap.set(membership.status, entry);
      }

      return Array.from(statusMap.entries()).map(([status, entry]) => ({
        status,
        count: entry.count,
        packageBreakdown: Array.from(entry.packageMap.entries()).map(([packageName, count]) => ({
          packageId: packageName,
          packageName: packageName,
          count,
        })),
      }));
    },

    async listPackageUtilizationReport({ tenantId }) {
      const [memberships, packages] = await Promise.all([
        prisma.membership.findMany({
          where: { tenantId },
          select: { packageId: true, status: true },
        }),
        prisma.package.findMany({
          where: { tenantId },
          select: { id: true, name: true },
        }),
      ]);

      const packageMap = new Map(packages.map((pkg) => [pkg.id, pkg.name]));
      const utilizationMap = new Map<string, { total: number; active: number }>();

      for (const membership of memberships) {
        const entry = utilizationMap.get(membership.packageId) ?? { total: 0, active: 0 };
        entry.total += 1;
        if (membership.status === "active" || membership.status === "Active") {
          entry.active += 1;
        }
        utilizationMap.set(membership.packageId, entry);
      }

      return Array.from(utilizationMap.entries()).map(([packageId, entry]) => ({
        packageId,
        packageName: packageMap.get(packageId) ?? "Unknown",
        totalMemberships: entry.total,
        activeMemberships: entry.active,
      }));
    },

    async getGstSummary({ tenantId }) {
      const invoices = await prisma.invoice.findMany({
        where: { tenantId },
        select: { gstCents: true, subtotalCents: true },
      });

      const totalGstCents = invoices.reduce((sum, invoice) => sum + invoice.gstCents, 0);
      const totalTaxableCents = invoices.reduce((sum, invoice) => sum + invoice.subtotalCents, 0);

      return {
        totalGstCents,
        totalTaxableCents,
        invoiceCount: invoices.length,
      };
    },

    async listBranchPerformance({ tenantId }) {
      const branches = await prisma.branch.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      });

      const results = await Promise.all(
        branches.map(async (branch) => {
          const [staffCount, attendanceCount] = await Promise.all([
            prisma.staff.count({ where: { tenantId, branchId: branch.id } }),
            prisma.attendance.count({
              where: {
                tenantId,
                staff: { branchId: branch.id },
              },
            }),
          ]);

          return {
            branchId: branch.id,
            branchName: branch.name,
            staffCount,
            attendanceCount,
          };
        }),
      );

      return results;
    },

    async getInventoryStockReport({ tenantId, branchId }) {
      const where: Record<string, unknown> = { tenantId };
      if (branchId) {
        where.branchId = branchId;
      }

      const stockItems = await prisma.stockItem.findMany({
        where,
        select: { id: true, quantity: true, createdAt: true, updatedAt: true, productId: true, branchId: true },
      });

      const productIds = Array.from(new Set(stockItems.map((item) => item.productId)));
      const branchIds = Array.from(new Set(stockItems.map((item) => item.branchId)));

      const [products, branches] = await Promise.all([
        prisma.product.findMany({
          where: { id: { in: productIds }, tenantId },
          select: { id: true, name: true },
        }),
        prisma.branch.findMany({
          where: { id: { in: branchIds }, tenantId },
          select: { id: true, name: true },
        }),
      ]);

      const productMap = new Map(products.map((product) => [product.id, product.name]));
      const branchMap = new Map(branches.map((branch) => [branch.id, branch.name]));

      return stockItems.map((item) => ({
        stockItemId: item.id,
        productId: item.productId,
        productName: productMap.get(item.productId) ?? "Unknown",
        branchId: item.branchId,
        branchName: branchMap.get(item.branchId) ?? "Unknown",
        quantity: item.quantity,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
    },
  };
}