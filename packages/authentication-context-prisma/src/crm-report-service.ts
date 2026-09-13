export interface LeadSourceRow {
  readonly source: string;
  readonly count: number;
}

export interface FunnelRow {
  readonly stageName: string;
  readonly position: number;
  readonly count: number;
  readonly valueCents: number;
}

export interface ConversionReport {
  readonly totalLeads: number;
  readonly convertedLeads: number;
  readonly conversionRate: number;
}

export interface PendingFollowupRow {
  readonly id: string;
  readonly title: string;
  readonly dueAt: Date;
  readonly entityName: string | null;
  readonly entityType: string | null;
}

export interface CustomerGrowthRow {
  readonly month: string;
  readonly count: number;
}

export interface CrmReportService {
  getLeadSourceReport(args: { tenantId: string }): Promise<readonly LeadSourceRow[]>;
  getSalesFunnel(args: { tenantId: string }): Promise<readonly FunnelRow[]>;
  getConversionReport(args: { tenantId: string }): Promise<ConversionReport>;
  getPendingFollowups(args: { tenantId: string }): Promise<readonly PendingFollowupRow[]>;
  getCustomerGrowth(args: { tenantId: string }): Promise<readonly CustomerGrowthRow[]>;
}

interface CrmReportPrismaClient {
  readonly lead: {
    groupBy: (args: { by: readonly string[]; where: Record<string, unknown>; _count: Record<string, boolean> }) => Promise<ReadonlyArray<Record<string, unknown>>>;
    count: (args: { where: Record<string, unknown> }) => Promise<number>;
  };
  readonly opportunity: {
    groupBy: (args: { by: readonly string[]; where: Record<string, unknown>; _count: Record<string, boolean>; _sum: Record<string, boolean> }) => Promise<ReadonlyArray<Record<string, unknown>>>;
  };
  readonly followup: {
    findMany: (args: { where: Record<string, unknown>; orderBy?: Record<string, unknown>; select?: Record<string, unknown> }) => Promise<ReadonlyArray<Record<string, unknown>>>;
  };
  readonly customer: {
    findMany: (args: { where: Record<string, unknown>; select: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<ReadonlyArray<Record<string, unknown>>>;
  };
  readonly stage: {
    findMany: (args: { where: Record<string, unknown>; orderBy?: Record<string, unknown>; select?: Record<string, unknown> }) => Promise<ReadonlyArray<Record<string, unknown>>>;
  };
}

export function createCrmReportService(prisma: CrmReportPrismaClient): CrmReportService {
  return {
    async getLeadSourceReport({ tenantId }) {
      const grouped = await prisma.lead.groupBy({
        by: ["source"],
        where: { tenantId },
        _count: { id: true },
      });
      return grouped.map((g) => ({
        source: (g.source as string) ?? "Unknown",
        count: (g._count as number) ?? 0,
      }));
    },

    async getSalesFunnel({ tenantId }) {
      const stages = await prisma.stage.findMany({
        where: { tenantId, isActive: true },
        orderBy: { position: "asc" },
        select: { id: true, name: true, position: true },
      });

      const opportunities = await prisma.opportunity.groupBy({
        by: ["stageId"],
        where: { tenantId, status: "OPEN" },
        _count: { id: true },
        _sum: { valueCents: true },
      });

      const oppMap = new Map(opportunities.map((o) => [o.stageId as string, o]));

      return stages.map((s) => {
        const opp = oppMap.get(s.id as string);
        const sum = opp?._sum as { valueCents?: number } | undefined;
        const count = opp?._count as number | undefined;
        return {
          stageName: s.name as string,
          position: s.position as number,
          count: count ?? 0,
          valueCents: sum?.valueCents ?? 0,
        };
      });
    },

    async getConversionReport({ tenantId }) {
      const totalLeads = await prisma.lead.count({ where: { tenantId } });
      const convertedLeads = await prisma.lead.count({ where: { tenantId, status: "CONVERTED" } });
      return {
        totalLeads,
        convertedLeads,
        conversionRate: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 10000) / 100 : 0,
      };
    },

    async getPendingFollowups({ tenantId }) {
      const followups = await prisma.followup.findMany({
        where: { tenantId, status: "PENDING" },
        orderBy: { dueAt: "asc" },
        select: { id: true, title: true, dueAt: true, leadId: true, customerId: true, opportunityId: true },
      });

      return followups.map((f) => ({
        id: f.id as string,
        title: f.title as string,
        dueAt: f.dueAt as Date,
        entityName: null,
        entityType: f.leadId ? "Lead" : f.customerId ? "Customer" : f.opportunityId ? "Opportunity" : null,
      }));
    },

    async getCustomerGrowth({ tenantId }) {
      const customers = await prisma.customer.findMany({
        where: { tenantId },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      });

      const monthMap = new Map<string, number>();
      for (const c of customers) {
        const date = c.createdAt as Date;
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
      }

      return Array.from(monthMap.entries()).map(([month, count]) => ({ month, count }));
    },
  };
}
