import {
  calculatePayout,
  calculateRoyalty,
  splitRoyaltyEqually,
  buildTermsSnapshot,
  calculateNetSales,
} from "./franchise-commercial-service";

export interface FranchiseSettlementRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly agreementId: string;
  readonly partnerId: string;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly status: string;
  readonly grossSalesCents: number;
  readonly gstCents: number;
  readonly netSalesCents: number;
  readonly mgCents: number;
  readonly variableReturnCents: number;
  readonly payoutCents: number;
  readonly royaltyCents: number;
  readonly adjustmentCents: number;
  readonly totalCents: number;
  readonly termsSnapshot: Record<string, unknown> | null;
  readonly generatedAt: Date;
  readonly generatedBy: string | null;
  readonly approvedAt: Date | null;
  readonly approvedBy: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface FranchiseSettlementLineRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly settlementId: string;
  readonly lineType: string;
  readonly description: string;
  readonly amountCents: number;
  readonly metadata: Record<string, unknown> | null;
  readonly createdAt: Date;
}

export interface FranchisePaymentRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly settlementId: string;
  readonly amountCents: number;
  readonly method: string;
  readonly status: string;
  readonly reference: string | null;
  readonly paidAt: Date;
  readonly confirmedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SettlementGenerateInput {
  readonly agreementId: string;
  readonly periodStart: string;
  readonly periodEnd: string;
}

export interface SettlementService {
  generateSettlement(args: { tenantId: string; input: SettlementGenerateInput; userId: string }): Promise<{ settlement: FranchiseSettlementRecord; lines: readonly FranchiseSettlementLineRecord[] } | { error: string; status: number }>;
  getSettlement(args: { tenantId: string; settlementId: string }): Promise<{ settlement: FranchiseSettlementRecord; lines: readonly FranchiseSettlementLineRecord[]; payments: readonly FranchisePaymentRecord[] } | null>;
  listSettlements(args: { tenantId: string; agreementId?: string; partnerId?: string; status?: string }): Promise<readonly FranchiseSettlementRecord[]>;
  approveSettlement(args: { tenantId: string; settlementId: string; userId: string }): Promise<FranchiseSettlementRecord | { error: string; status: number }>;
}

interface SettlementPrismaClient {
  readonly franchiseAgreement: {
    findUnique(args: { where: { id: string }; include?: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
  };
  readonly franchiseAgreementOutlet: {
    findMany(args: { where: Record<string, unknown>; select?: Record<string, unknown> }): Promise<ReadonlyArray<Record<string, unknown>>>;
  };
  readonly franchiseOutletProfile: {
    findMany(args: { where: Record<string, unknown>; select?: Record<string, unknown> }): Promise<ReadonlyArray<Record<string, unknown>>>;
  };
  readonly invoice: {
    findMany(args: { where: Record<string, unknown>; select?: Record<string, unknown> }): Promise<ReadonlyArray<Record<string, unknown>>>;
  };
  readonly franchiseSettlement: {
    create(args: { data: Record<string, unknown> }): Promise<FranchiseSettlementRecord>;
    findUnique(args: { where: { id: string }; include?: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
    findMany(args: { where: Record<string, unknown>; orderBy?: Record<string, unknown> }): Promise<readonly FranchiseSettlementRecord[]>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<FranchiseSettlementRecord>;
  };
  readonly franchiseSettlementLine: {
    createMany(args: { data: ReadonlyArray<Record<string, unknown>> }): Promise<unknown>;
    findMany(args: { where: Record<string, unknown> }): Promise<readonly FranchiseSettlementLineRecord[]>;
  };
  readonly franchisePayment: {
    findMany(args: { where: Record<string, unknown> }): Promise<readonly FranchisePaymentRecord[]>;
  };
  readonly auditLog: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
  $transaction<T>(callback: (tx: SettlementPrismaClient) => Promise<T>): Promise<T>;
}

function isValidCalendarMonth(start: Date, end: Date): boolean {
  if (start.getUTCDate() !== 1) return false;
  const expectedEnd = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  if (end.getUTCFullYear() !== expectedEnd.getUTCFullYear()) return false;
  if (end.getUTCMonth() !== expectedEnd.getUTCMonth()) return false;
  if (end.getUTCDate() !== expectedEnd.getUTCDate()) return false;
  return true;
}

export function createSettlementService(prisma: SettlementPrismaClient): SettlementService {
  return {
    async generateSettlement({ tenantId, input, userId }) {
      const periodStart = new Date(input.periodStart);
      const periodEnd = new Date(input.periodEnd);

      if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
        return { error: "Invalid date format", status: 400 };
      }
      if (periodStart >= periodEnd) {
        return { error: "periodStart must be before periodEnd", status: 400 };
      }
      if (!isValidCalendarMonth(periodStart, periodEnd)) {
        return { error: "Period must be exactly one calendar month (1st to last day)", status: 400 };
      }

      const nextMonthStart = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1));

      const agreement = await prisma.franchiseAgreement.findUnique({
        where: { id: input.agreementId },
        include: {
          partner: { select: { id: true } },
          outlets: { select: { branchId: true } },
        },
      });
      if (agreement === null || agreement.tenantId !== tenantId) {
        return { error: "Agreement not found", status: 404 };
      }

      const partnerId = agreement.partnerId as string;
      const branchIds = (agreement.outlets as ReadonlyArray<{ branchId: string }>).map((o) => o.branchId);

      let grossSalesCents = 0;
      let gstCents = 0;

      if (branchIds.length > 0) {
        const invoices = await prisma.invoice.findMany({
          where: {
            tenantId,
            branchId: { in: branchIds },
            issuedAt: { gte: periodStart, lt: nextMonthStart },
          },
          select: { totalCents: true, gstCents: true },
        });
        for (const inv of invoices) {
          grossSalesCents += inv.totalCents as number;
          gstCents += inv.gstCents as number;
        }
      }

      const netSalesCents = calculateNetSales(grossSalesCents, gstCents);

      const investmentCents = await prisma.franchiseOutletProfile.findMany({
        where: { tenantId, partnerId, branchId: { in: branchIds } },
        select: { investmentCents: true },
      });
      const maxInvestment = investmentCents.reduce(
        (max, o) => Math.max(max, (o.investmentCents as number) ?? 0),
        0,
      );

      const payout = calculatePayout(
        {
          minimumGuaranteeCents: agreement.minimumGuaranteeCents as number | null,
          mgFormulaRateBp: agreement.mgFormulaRateBp as number | null,
          mgFormulaBase: agreement.mgFormulaBase as string | null,
          variableReturnRateBp: agreement.variableReturnRateBp as number | null,
          payoutRule: agreement.payoutRule as string | null,
        },
        maxInvestment > 0 ? maxInvestment : null,
        netSalesCents,
      );

      // Royalty: TR-03 requires all operational outlets in territory
      const territoryId = agreement.territoryId as string;
      const territoryBranches = await prisma.franchiseAgreementOutlet.findMany({
        where: { tenantId, agreement: { territoryId } },
        select: { branchId: true },
      });
      const territoryBranchIds = territoryBranches.map((b) => b.branchId as string);

      let territorySalesCents = grossSalesCents;
      if (territoryBranchIds.length > 0 && territoryBranchIds.some((id) => !branchIds.includes(id))) {
        const territoryInvoices = await prisma.invoice.findMany({
          where: {
            tenantId,
            branchId: { in: territoryBranchIds },
            issuedAt: { gte: periodStart, lt: nextMonthStart },
          },
          select: { totalCents: true, gstCents: true },
        });
        territorySalesCents = 0;
        for (const inv of territoryInvoices) {
          territorySalesCents += (inv.totalCents as number) - (inv.gstCents as number);
        }
      }

      const territoryAgreements = await prisma.franchiseAgreement.findMany({
        where: { tenantId, territoryId, isActive: true },
        select: { partnerId: true },
      });
      const eligiblePartnerCount = new Set(territoryAgreements.map((a) => a.partnerId as string)).size;

      const royalty = calculateRoyalty(
        territorySalesCents,
        agreement.territoryRoyaltyRateBp as number | null,
      );
      const individualRoyaltyCents = splitRoyaltyEqually(royalty.poolCents, eligiblePartnerCount);

      const adjustmentCents = 0;
      const totalCents = payout.payableCents + individualRoyaltyCents + adjustmentCents;

      const termsSnapshot = buildTermsSnapshot(
        {
          minimumGuaranteeCents: agreement.minimumGuaranteeCents as number | null,
          mgFormulaRateBp: agreement.mgFormulaRateBp as number | null,
          mgFormulaBase: agreement.mgFormulaBase as string | null,
          variableReturnRateBp: agreement.variableReturnRateBp as number | null,
          variableReturnBasis: agreement.variableReturnBasis as string | null,
          payoutRule: agreement.payoutRule as string | null,
          territoryRoyaltyRateBp: agreement.territoryRoyaltyRateBp as number | null,
        },
        maxInvestment > 0 ? maxInvestment : null,
      );

      const snapshotWithSales = {
        ...termsSnapshot,
        periodGrossSalesCents: grossSalesCents,
        periodGSTCents: gstCents,
        periodNetSalesCents: netSalesCents,
        applicableBranchIds: branchIds,
        territoryId,
        territoryBranchIds,
        territorySalesCents,
        royaltyPoolCents: royalty.poolCents,
        royaltyEligiblePartnerCount: eligiblePartnerCount,
        individualRoyaltyCents,
        capturedAt: new Date().toISOString(),
      };

      const lines = [
        { lineType: "MG", description: `Minimum Guarantee (${payout.mgSource})`, amountCents: payout.fixedMGCents, metadata: { source: payout.mgSource } },
        { lineType: "VARIABLE_RETURN", description: `Variable Return (${(agreement.variableReturnRateBp as number | null ?? 3000) / 100}%)`, amountCents: payout.variableReturnCents, metadata: { rateBp: agreement.variableReturnRateBp ?? 3000 } },
        { lineType: "PAYOUT", description: "Higher-of Payout (MG vs Variable)", amountCents: payout.payableCents, metadata: { rule: agreement.payoutRule ?? "HIGHER_OF_FIXED_AND_VARIABLE" } },
        { lineType: "ROYALTY", description: `Territory Royalty (${royalty.rateBp / 100}%, ${eligiblePartnerCount} partner${eligiblePartnerCount === 1 ? "" : "s"})`, amountCents: individualRoyaltyCents, metadata: { rateBp: royalty.rateBp, poolCents: royalty.poolCents, eligiblePartnerCount, individualCents: individualRoyaltyCents } },
      ];

      try {
        const result = await prisma.$transaction(async (tx) => {
          const settlement = await tx.franchiseSettlement.create({
            data: {
              tenantId,
              agreementId: input.agreementId,
              partnerId,
              periodStart,
              periodEnd,
              status: "CALCULATED",
              grossSalesCents,
              gstCents,
              netSalesCents,
              mgCents: payout.fixedMGCents,
              variableReturnCents: payout.variableReturnCents,
              payoutCents: payout.payableCents,
              royaltyCents: individualRoyaltyCents,
              adjustmentCents,
              totalCents,
              termsSnapshot: snapshotWithSales,
              generatedBy: userId,
            },
          });

          await tx.franchiseSettlementLine.createMany({
            data: lines.map((line) => ({
              tenantId,
              settlementId: settlement.id,
              lineType: line.lineType,
              description: line.description,
              amountCents: line.amountCents,
              metadata: line.metadata,
            })),
          });

          try {
            await tx.auditLog.create({
              data: {
                tenantId,
                actorUserId: userId,
                action: "settlement.generated",
                entityType: "FranchiseSettlement",
                entityId: settlement.id,
                metadata: { agreementId: input.agreementId, periodStart: input.periodStart, periodEnd: input.periodEnd, totalCents },
              },
            });
          } catch {
            // Audit is best-effort
          }

          return { settlement, lines: await tx.franchiseSettlementLine.findMany({ where: { tenantId, settlementId: settlement.id } }) };
        });

        return result;
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes("Unique constraint")) {
          return { error: "Settlement already exists for this agreement and period", status: 409 };
        }
        throw err;
      }
    },

    async getSettlement({ tenantId, settlementId }) {
      const settlement = await prisma.franchiseSettlement.findUnique({
        where: { id: settlementId },
      });
      if (settlement === null || settlement.tenantId !== tenantId) return null;

      const lines = await prisma.franchiseSettlementLine.findMany({
        where: { tenantId, settlementId },
      });
      const payments = await prisma.franchisePayment.findMany({
        where: { tenantId, settlementId },
      });

      return { settlement, lines, payments };
    },

    async listSettlements({ tenantId, agreementId, partnerId, status }) {
      const where: Record<string, unknown> = { tenantId };
      if (agreementId !== undefined) where.agreementId = agreementId;
      if (partnerId !== undefined) where.partnerId = partnerId;
      if (status !== undefined) where.status = status;
      return prisma.franchiseSettlement.findMany({ where, orderBy: { periodStart: "desc" } });
    },

    async approveSettlement({ tenantId, settlementId, userId }) {
      const settlement = await prisma.franchiseSettlement.findUnique({ where: { id: settlementId } });
      if (settlement === null || settlement.tenantId !== tenantId) {
        return { error: "Settlement not found", status: 404 };
      }
      if (settlement.status !== "CALCULATED") {
        return { error: `Cannot approve settlement with status ${settlement.status}`, status: 400 };
      }

      const updated = await prisma.franchiseSettlement.update({
        where: { id: settlementId },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedBy: userId,
        },
      });

      try {
        await prisma.auditLog.create({
          data: {
            tenantId,
            actorUserId: userId,
            action: "settlement.approved",
            entityType: "FranchiseSettlement",
            entityId: settlementId,
            metadata: { previousStatus: "CALCULATED" },
          },
        });
      } catch {
        // Audit is best-effort
      }

      return updated;
    },
  };
}
