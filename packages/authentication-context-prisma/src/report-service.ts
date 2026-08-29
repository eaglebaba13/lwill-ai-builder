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
}

interface ReportPrismaClient {
  readonly invoice: {
    findMany(args: { where?: Record<string, unknown>; select?: Record<string, unknown> }): Promise<ReadonlyArray<{ readonly totalCents: number }>>;
  };
  readonly appointment: {
    findMany(args: { where?: Record<string, unknown>; select?: Record<string, unknown> }): Promise<ReadonlyArray<{ readonly status: string }>>;
  };
  readonly customer: {
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
  readonly stockItem: {
    count(args: { where: Record<string, unknown> }): Promise<number>;
    findMany(args: { where?: Record<string, unknown>; select?: Record<string, unknown> }): Promise<ReadonlyArray<{ readonly quantity: number }>>;
  };
  readonly stockMovement: {
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
}

export function createReportService(prisma: ReportPrismaClient): ReportService {
  return {
    async getReportSummary({ tenantId }) {
      const invoices = await prisma.invoice.findMany({
        where: { tenantId },
        select: { totalCents: true },
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
  };
}
