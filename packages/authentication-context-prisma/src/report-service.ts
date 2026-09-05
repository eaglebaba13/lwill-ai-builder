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
  getFranchiseOverview(args: { tenantId: string; userId?: string }): Promise<{
    readonly branches: ReadonlyArray<{
      readonly branchId: string;
      readonly branchName: string;
      readonly isActive: boolean;
      readonly createdAt: string;
    }>;
    readonly sales: {
      readonly invoiceCount: number;
      readonly totalRevenueCents: number;
      readonly dailyTrend: ReadonlyArray<{
        readonly date: string;
        readonly invoiceCount: number;
        readonly totalRevenueCents: number;
      }>;
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
      readonly lowStockItems: ReadonlyArray<{
        readonly productId: string;
        readonly productName: string;
        readonly branchId: string;
        readonly branchName: string;
        readonly quantity: number;
      }>;
    };
    readonly branchPerformance: ReadonlyArray<{
      readonly branchId: string;
      readonly branchName: string;
      readonly staffCount: number;
      readonly attendanceCount: number;
    }>;
  }>;
  getFranchisePayout(args: {
    readonly tenantId: string;
    readonly userId?: string;
    readonly year: number;
    readonly month: number;
  }): Promise<{
    readonly year: number;
    readonly month: number;
    readonly payouts: ReadonlyArray<{
      readonly partnerId: string;
      readonly partnerName: string;
      readonly agreementPayouts: ReadonlyArray<{
        readonly agreementId: string;
        readonly branchId: string;
        readonly branchName: string;
        readonly territoryId: string;
        readonly territoryName: string;
        readonly grossRevenueCents: number;
        readonly revenueShareCents: number;
        readonly eligibleRevenueSharePayoutCents: number;
      }>;
      readonly totalRevenueSharePayoutCents: number;
      readonly territoryRoyalties: ReadonlyArray<{
        readonly territoryId: string;
        readonly territoryName: string;
        readonly territorySalesTurnoverCents: number;
        readonly royaltyPoolCents: number;
        readonly eligiblePartnerCount: number;
        readonly individualRoyaltyCents: number;
      }>;
      readonly totalTerritoryRoyaltyCents: number;
      readonly totalEligiblePayoutCents: number;
    }>;
  }>;
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
    findMany(args: { where?: Record<string, unknown>; select?: Record<string, unknown>; orderBy?: Record<string, unknown> }): Promise<ReadonlyArray<{ readonly totalCents: number; readonly issuedAt: Date; readonly gstCents: number; readonly subtotalCents: number; readonly branchId: string }>>;
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
    findMany(args: { where?: Record<string, unknown>; select?: Record<string, unknown> }): Promise<ReadonlyArray<{ readonly id: string; readonly name: string; readonly isActive: boolean; readonly territoryId: string | null; readonly createdAt: Date }>>;
  };
  readonly territory: {
    findMany(args: { where?: Record<string, unknown>; select?: Record<string, unknown> }): Promise<ReadonlyArray<{ readonly id: string; readonly name: string }>>;
  };
  readonly franchisePartner: {
    findMany(args: { where?: Record<string, unknown>; select?: Record<string, unknown> }): Promise<ReadonlyArray<{ readonly id: string }>>;
    findFirst(args: { where?: Record<string, unknown>; select?: Record<string, unknown> }): Promise<{ readonly id: string } | null>;
  };
  readonly franchiseOutletProfile: {
    findMany(args: { where?: Record<string, unknown>; select?: Record<string, unknown> }): Promise<ReadonlyArray<{ readonly branchId: string; readonly investmentCents: number | null }>>;
  };
  readonly franchiseAgreement: {
    findMany(args: { where?: Record<string, unknown>; select?: Record<string, unknown>; include?: Record<string, unknown> }): Promise<ReadonlyArray<{
      readonly id: string;
      readonly partnerId: string;
      readonly territoryId: string;
      readonly startDate: Date;
      readonly endDate: Date | null;
      readonly minimumGuaranteeCents: number | null;
      readonly mgFormulaRateBp: number | null;
      readonly territoryRoyaltyRateBp: number | null;
      readonly partner: { readonly id: string; readonly name: string };
      readonly territory: { readonly id: string; readonly name: string };
      readonly outlets: ReadonlyArray<{
        readonly id: string;
        readonly branchId: string;
        readonly branch: { readonly id: string; readonly name: string; readonly territoryId: string | null };
      }>;
    }>>;
  };
  readonly franchiseRevenueDistribution: {
    findMany(args: { where?: Record<string, unknown>; select?: Record<string, unknown> }): Promise<ReadonlyArray<{ readonly agreementOutletId: string; readonly percentage: number }>>;
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

    async getFranchiseOverview({ tenantId, userId }) {
      let targetBranchIds: string[] | undefined;
      if (userId) {
        const partner = await prisma.franchisePartner.findFirst({
          where: { tenantId, userId, isActive: true },
          select: { id: true },
        });
        if (!partner) {
          return {
            branches: [],
            sales: { invoiceCount: 0, totalRevenueCents: 0, dailyTrend: [] },
            appointments: { total: 0, statusBreakdown: [] },
            customers: { total: 0 },
            inventory: { lowStockItems: [] },
            branchPerformance: [],
          };
        }
        const outletProfiles = await prisma.franchiseOutletProfile.findMany({
          where: { tenantId, partnerId: partner.id, isActive: true },
          select: { branchId: true },
        });
        targetBranchIds = outletProfiles.map((profile) => profile.branchId);
        if (targetBranchIds.length === 0) {
          return {
            branches: [],
            sales: { invoiceCount: 0, totalRevenueCents: 0, dailyTrend: [] },
            appointments: { total: 0, statusBreakdown: [] },
            customers: { total: 0 },
            inventory: { lowStockItems: [] },
            branchPerformance: [],
          };
        }
      }

      const branchFilter = targetBranchIds === undefined ? { tenantId } : { tenantId, id: { in: targetBranchIds } };
      const invoiceFilter = targetBranchIds === undefined ? { tenantId } : { tenantId, branchId: { in: targetBranchIds } };
      const appointmentFilter = targetBranchIds === undefined ? { tenantId } : { tenantId, branchId: { in: targetBranchIds } };
      const stockItemFilter = targetBranchIds === undefined ? { tenantId } : { tenantId, branchId: { in: targetBranchIds } };

      const [branches, invoices, appointments, customerCount, stockItems, products, branchPerformance] = await Promise.all([
        prisma.branch.findMany({
          where: branchFilter,
          select: { id: true, name: true, isActive: true, createdAt: true },
        }),
        prisma.invoice.findMany({
          where: invoiceFilter,
          select: { totalCents: true, issuedAt: true },
        }),
        prisma.appointment.findMany({
          where: appointmentFilter,
          select: { startsAt: true, status: true },
        }),
        prisma.customer.count({ where: { tenantId } }),
        prisma.stockItem.findMany({
          where: stockItemFilter,
          select: { productId: true, branchId: true, quantity: true },
        }),
        prisma.product.findMany({
          where: { tenantId },
          select: { id: true, name: true },
        }),
        prisma.branch.findMany({
          where: branchFilter,
          select: { id: true, name: true },
        }),
      ]);

      const productMap = new Map(products.map((product) => [product.id, product.name]));
      const branchMap = new Map(branches.map((branch) => [branch.id, branch.name]));

      const dailyMap = new Map<string, { invoiceCount: number; totalRevenueCents: number }>();
      for (const invoice of invoices) {
        const dateKey = new Date(invoice.issuedAt).toISOString().slice(0, 10);
        const current = dailyMap.get(dateKey) ?? { invoiceCount: 0, totalRevenueCents: 0 };
        dailyMap.set(dateKey, {
          invoiceCount: current.invoiceCount + 1,
          totalRevenueCents: current.totalRevenueCents + invoice.totalCents,
        });
      }

      const statusBreakdown = new Map<string, number>();
      for (const appointment of appointments) {
        const current = statusBreakdown.get(appointment.status) ?? 0;
        statusBreakdown.set(appointment.status, current + 1);
      }

      const lowStockItems = stockItems
        .filter((item) => item.quantity <= 10)
        .map((item) => ({
          productId: item.productId,
          productName: productMap.get(item.productId) ?? "Unknown",
          branchId: item.branchId,
          branchName: branchMap.get(item.branchId) ?? "Unknown",
          quantity: item.quantity,
        }));

      const branchPerformanceResults = await Promise.all(
        branchPerformance.map(async (branch) => {
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

      return {
        branches: branches.map((branch) => ({
          branchId: branch.id,
          branchName: branch.name,
          isActive: branch.isActive,
          createdAt: branch.createdAt.toISOString(),
        })),
        sales: {
          invoiceCount: invoices.length,
          totalRevenueCents: invoices.reduce((sum, invoice) => sum + invoice.totalCents, 0),
          dailyTrend: Array.from(dailyMap.entries()).map(([date, values]) => ({
            date,
            ...values,
          })),
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
          lowStockItems,
        },
        branchPerformance: branchPerformanceResults,
      };
    },

    async getFranchisePayout({ tenantId, userId, year, month }) {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 1);

      let targetPartnerIds: string[];
      if (userId) {
        const partner = await prisma.franchisePartner.findFirst({
          where: { tenantId, userId, isActive: true },
          select: { id: true },
        });
        if (!partner) {
          return { year, month, payouts: [] };
        }
        targetPartnerIds = [partner.id];
      } else {
        const partners = await prisma.franchisePartner.findMany({
          where: { tenantId, isActive: true },
          select: { id: true },
        });
        targetPartnerIds = partners.map((partner) => partner.id);
        if (targetPartnerIds.length === 0) {
          return { year, month, payouts: [] };
        }
      }

      const agreements = await prisma.franchiseAgreement.findMany({
        where: {
          tenantId,
          partnerId: { in: targetPartnerIds },
          isActive: true,
          startDate: { lte: monthEnd },
          OR: [
            { endDate: null },
            { endDate: { gte: monthStart } },
          ],
        },
        include: {
          partner: { select: { id: true, name: true } },
          territory: { select: { id: true, name: true } },
          outlets: {
            select: {
              id: true,
              branchId: true,
              branch: { select: { id: true, name: true, territoryId: true } },
            },
          },
        },
      });

      if (agreements.length === 0) {
        return { year, month, payouts: [] };
      }

      const territoryIds = [...new Set(agreements.map((agreement) => agreement.territoryId))];
      const branchIds = [...new Set(agreements.flatMap((agreement) => agreement.outlets.map((outlet) => outlet.branchId)))];
      const agreementOutletIds = agreements.flatMap((agreement) => agreement.outlets.map((outlet) => outlet.id));

      const [territories, branches, invoices, allTerritoryAgreements, allTerritoryBranches, distributions, outletProfiles] = await Promise.all([
        prisma.territory.findMany({
          where: { tenantId, id: { in: territoryIds } },
          select: { id: true, name: true },
        }),
        prisma.branch.findMany({
          where: { tenantId, id: { in: branchIds } },
          select: { id: true, name: true, territoryId: true },
        }),
        prisma.invoice.findMany({
          where: {
            tenantId,
            branchId: { in: branchIds },
            issuedAt: {
              gte: monthStart,
              lt: monthEnd,
            },
          },
          select: { branchId: true, totalCents: true, gstCents: true },
        }),
        prisma.franchiseAgreement.findMany({
          where: {
            tenantId,
            territoryId: { in: territoryIds },
            isActive: true,
            startDate: { lte: monthEnd },
            OR: [
              { endDate: null },
              { endDate: { gte: monthStart } },
            ],
          },
          select: { partnerId: true, territoryId: true, territoryRoyaltyRateBp: true },
        }),
        prisma.branch.findMany({
          where: { tenantId, territoryId: { in: territoryIds } },
          select: { id: true, territoryId: true },
        }),
        prisma.franchiseRevenueDistribution.findMany({
          where: {
            tenantId,
            agreementOutletId: { in: agreementOutletIds },
            beneficiary: "FRANCHISE_OWNER",
            isActive: true,
          },
          select: { agreementOutletId: true, percentage: true },
        }),
        prisma.franchiseOutletProfile.findMany({
          where: {
            tenantId,
            branchId: { in: branchIds },
            isActive: true,
          },
          select: { branchId: true, investmentCents: true },
        }),
      ]);

      const distributionMap = new Map(distributions.map((distribution) => [distribution.agreementOutletId, distribution.percentage]));

      const territoryMap = new Map(territories.map((territory) => [territory.id, territory]));
      const branchMap = new Map(branches.map((branch) => [branch.id, branch]));
      const investmentMap = new Map(outletProfiles.map((profile) => [profile.branchId, profile.investmentCents]));

      const allTerritoryBranchIds = allTerritoryBranches.map((branch) => branch.id);
      const allTerritoryInvoices = await prisma.invoice.findMany({
        where: {
          tenantId,
          branchId: { in: allTerritoryBranchIds },
          issuedAt: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
        select: { branchId: true, totalCents: true, gstCents: true },
      });

      const branchSalesMap = new Map<string, number>();
      for (const invoice of invoices) {
        const netSalesCents = invoice.totalCents - invoice.gstCents;
        branchSalesMap.set(invoice.branchId, (branchSalesMap.get(invoice.branchId) ?? 0) + netSalesCents);
      }

      const allTerritoryBranchSalesMap = new Map<string, number>();
      for (const invoice of allTerritoryInvoices) {
        const netSalesCents = invoice.totalCents - invoice.gstCents;
        allTerritoryBranchSalesMap.set(invoice.branchId, (allTerritoryBranchSalesMap.get(invoice.branchId) ?? 0) + netSalesCents);
      }

      const territorySalesMap = new Map<string, number>();
      for (const [branchId, sales] of allTerritoryBranchSalesMap.entries()) {
        const branch = allTerritoryBranches.find((b) => b.id === branchId);
        if (branch?.territoryId) {
          territorySalesMap.set(branch.territoryId, (territorySalesMap.get(branch.territoryId) ?? 0) + sales);
        }
      }

      const allTerritoryPartnerMap = new Map<string, Set<string>>();
      const territoryRoyaltyRateBpMap = new Map<string, number>();
      for (const agreement of allTerritoryAgreements) {
        const territoryId = agreement.territoryId;
        if (!allTerritoryPartnerMap.has(territoryId)) {
          allTerritoryPartnerMap.set(territoryId, new Set());
        }
        allTerritoryPartnerMap.get(territoryId)!.add(agreement.partnerId);
        if (agreement.territoryRoyaltyRateBp != null && !territoryRoyaltyRateBpMap.has(territoryId)) {
          territoryRoyaltyRateBpMap.set(territoryId, agreement.territoryRoyaltyRateBp);
        }
      }

      const territoryRoyaltyMap = new Map<string, { poolCents: number; eligibleCount: number; individualCents: number }>();
      for (const [territoryId, partners] of allTerritoryPartnerMap.entries()) {
        const sales = territorySalesMap.get(territoryId) ?? 0;
        const royaltyRateBp = territoryRoyaltyRateBpMap.get(territoryId) ?? 200;
        const poolCents = Math.round((sales * royaltyRateBp) / 10000);
        const eligibleCount = partners.size;
        const individualCents = eligibleCount > 0 ? Math.round(poolCents / eligibleCount) : 0;
        territoryRoyaltyMap.set(territoryId, { poolCents, eligibleCount, individualCents });
      }

      const partnerAgreementMap = new Map<string, typeof agreements>();
      for (const agreement of agreements) {
        const partnerId = agreement.partnerId;
        partnerAgreementMap.set(partnerId, [...(partnerAgreementMap.get(partnerId) ?? []), agreement]);
      }

      const payouts = [...partnerAgreementMap.entries()].map(([partnerId, partnerAgreements]) => {
        const agreementPayouts = partnerAgreements.flatMap((agreement) =>
          agreement.outlets.map((outlet) => {
            const grossRevenueCents = branchSalesMap.get(outlet.branchId) ?? 0;
            const percentage = distributionMap.get(outlet.id) ?? 0;
            const revenueShareCents = Math.round((grossRevenueCents * percentage) / 100);
            const investmentCents = investmentMap.get(outlet.branchId);
            const formulaMGCents = (agreement.mgFormulaRateBp != null && investmentCents != null)
              ? Math.round((investmentCents * agreement.mgFormulaRateBp) / 10000)
              : null;
            const minimumGuaranteeCents = agreement.minimumGuaranteeCents ?? formulaMGCents ?? 1500000;
            const netSalesVariableReturnCents = Math.round(grossRevenueCents * 0.30);
            const eligibleRevenueSharePayoutCents = Math.max(minimumGuaranteeCents, netSalesVariableReturnCents);

            return {
              agreementId: agreement.id,
              branchId: outlet.branch.id,
              branchName: outlet.branch.name,
              territoryId: agreement.territory.id,
              territoryName: agreement.territory.name,
              grossRevenueCents,
              revenueShareCents,
              eligibleRevenueSharePayoutCents,
            };
          })
        );

        const totalRevenueSharePayoutCents = agreementPayouts.reduce((sum, item) => sum + item.eligibleRevenueSharePayoutCents, 0);

        const territoryRoyalties = [...new Set(partnerAgreements.map((a) => a.territoryId))].map((territoryId) => {
          const territory = territoryMap.get(territoryId)!;
          const royalty = territoryRoyaltyMap.get(territoryId)!;

          return {
            territoryId,
            territoryName: territory.name,
            territorySalesTurnoverCents: territorySalesMap.get(territoryId) ?? 0,
            royaltyPoolCents: royalty.poolCents,
            eligiblePartnerCount: royalty.eligibleCount,
            individualRoyaltyCents: royalty.individualCents,
          };
        });

        const totalTerritoryRoyaltyCents = territoryRoyalties.reduce((sum, item) => sum + item.individualRoyaltyCents, 0);

        return {
          partnerId,
          partnerName: partnerAgreements[0]?.partner?.name ?? "Unknown",
          agreementPayouts,
          totalRevenueSharePayoutCents,
          territoryRoyalties,
          totalTerritoryRoyaltyCents,
          totalEligiblePayoutCents: totalRevenueSharePayoutCents + totalTerritoryRoyaltyCents,
        };
      });

      return {
        year,
        month,
        payouts,
      };
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
