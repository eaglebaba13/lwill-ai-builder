export interface TerritoryRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly code: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface FranchisePartnerRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string | null;
  readonly name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly panNumber: string | null;
  readonly gstin: string | null;
  readonly address: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface FranchiseAgreementRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly partnerId: string;
  readonly territoryId: string;
  readonly startDate: Date;
  readonly endDate: Date | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly minimumGuaranteeCents: number | null;
  readonly mgFormulaRateBp: number | null;
  readonly mgFormulaBase: string | null;
  readonly variableReturnRateBp: number | null;
  readonly variableReturnBasis: string | null;
  readonly payoutRule: string | null;
  readonly termsSnapshot: Record<string, unknown> | null;
  readonly effectiveFrom: Date | null;
  readonly effectiveTo: Date | null;
}

export interface FranchiseOutletProfileRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly partnerId: string;
  readonly branchId: string;
  readonly territoryId: string | null;
  readonly outletType: string | null;
  readonly investmentCents: number | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface TerritoryCreateInput {
  readonly tenantId: string;
  readonly name: string;
  readonly code?: string | null;
}

export interface FranchisePartnerCreateInput {
  readonly tenantId: string;
  readonly name: string;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly panNumber?: string | null;
  readonly gstin?: string | null;
  readonly address?: string | null;
}

export interface FranchiseAgreementCreateInput {
  readonly tenantId: string;
  readonly partnerId: string;
  readonly territoryId: string;
  readonly startDate: Date;
  readonly endDate?: Date | null;
  readonly minimumGuaranteeCents?: number | null;
  readonly mgFormulaRateBp?: number | null;
  readonly mgFormulaBase?: string | null;
  readonly variableReturnRateBp?: number | null;
  readonly variableReturnBasis?: string | null;
  readonly payoutRule?: string | null;
  readonly termsSnapshot?: Record<string, unknown> | null;
  readonly effectiveFrom?: Date | null;
  readonly effectiveTo?: Date | null;
}

export interface FranchiseOutletProfileCreateInput {
  readonly tenantId: string;
  readonly partnerId: string;
  readonly branchId: string;
  readonly territoryId?: string | null;
  readonly outletType?: string | null;
  readonly investmentCents?: number | null;
}

export interface FranchiseDashboardData {
  readonly territories: ReadonlyArray<TerritoryRecord & { readonly outletCount: number; readonly partnerCount: number }>;
  readonly partners: ReadonlyArray<FranchisePartnerRecord & { readonly outletCount: number; readonly agreementCount: number }>;
  readonly agreements: ReadonlyArray<FranchiseAgreementRecord & { readonly partnerName: string; readonly territoryName: string; readonly outletCount: number }>;
  readonly outlets: ReadonlyArray<FranchiseOutletProfileRecord & { readonly partnerName: string; readonly branchName: string; readonly territoryName: string | null }>;
  readonly summary: {
    readonly totalTerritories: number;
    readonly totalPartners: number;
    readonly totalAgreements: number;
    readonly totalOutlets: number;
    readonly activeOutlets: number;
    readonly inactiveOutlets: number;
  };
}

export interface FranchiseService {
  listTerritories(args: { tenantId: string }): Promise<ReadonlyArray<TerritoryRecord & { readonly outletCount: number; readonly partnerCount: number }>>;
  getTerritory(args: { tenantId: string; territoryId: string }): Promise<(TerritoryRecord & { readonly outletCount: number; readonly partnerCount: number }) | null>;
  createTerritory(input: TerritoryCreateInput): Promise<TerritoryRecord>;

  listPartners(args: { tenantId: string }): Promise<ReadonlyArray<FranchisePartnerRecord & { readonly outletCount: number; readonly agreementCount: number }>>;
  getPartner(args: { tenantId: string; partnerId: string }): Promise<(FranchisePartnerRecord & { readonly outletCount: number; readonly agreementCount: number }) | null>;
  createPartner(input: FranchisePartnerCreateInput): Promise<FranchisePartnerRecord>;

  listAgreements(args: { tenantId: string }): Promise<ReadonlyArray<FranchiseAgreementRecord & { readonly partnerName: string; readonly territoryName: string; readonly outletCount: number }>>;
  getAgreement(args: { tenantId: string; agreementId: string }): Promise<(FranchiseAgreementRecord & { readonly partnerName: string; readonly territoryName: string; readonly outletCount: number }) | null>;
  createAgreement(input: FranchiseAgreementCreateInput): Promise<FranchiseAgreementRecord>;

  listOutlets(args: { tenantId: string }): Promise<ReadonlyArray<FranchiseOutletProfileRecord & { readonly partnerName: string; readonly branchName: string; readonly territoryName: string | null }>>;
  getOutlet(args: { tenantId: string; outletId: string }): Promise<(FranchiseOutletProfileRecord & { readonly partnerName: string; readonly branchName: string; readonly territoryName: string | null }) | null>;
  createOutlet(input: FranchiseOutletProfileCreateInput): Promise<FranchiseOutletProfileRecord>;

  getDashboard(args: { tenantId: string }): Promise<FranchiseDashboardData>;
}

interface FranchisePrismaClient {
  readonly territory: {
    create(args: { data: Record<string, unknown> }): Promise<TerritoryRecord>;
    findUnique(args: { where: { id: string } }): Promise<TerritoryRecord | null>;
    findMany(args: { where?: Record<string, unknown> }): Promise<TerritoryRecord[]>;
    count(args: { where?: Record<string, unknown> }): Promise<number>;
  };
  readonly franchisePartner: {
    create(args: { data: Record<string, unknown> }): Promise<FranchisePartnerRecord>;
    findUnique(args: { where: { id: string } }): Promise<FranchisePartnerRecord | null>;
    findMany(args: { where?: Record<string, unknown> }): Promise<FranchisePartnerRecord[]>;
    count(args: { where?: Record<string, unknown> }): Promise<number>;
  };
  readonly franchiseAgreement: {
    create(args: { data: Record<string, unknown> }): Promise<FranchiseAgreementRecord>;
    findUnique(args: { where: { id: string }; include?: Record<string, unknown> }): Promise<FranchiseAgreementRecord | null>;
    findMany(args: { where?: Record<string, unknown>; include?: Record<string, unknown> }): Promise<ReadonlyArray<FranchiseAgreementRecord & Record<string, unknown>>>;
    count(args: { where?: Record<string, unknown> }): Promise<number>;
  };
  readonly franchiseOutletProfile: {
    create(args: { data: Record<string, unknown> }): Promise<FranchiseOutletProfileRecord>;
    findUnique(args: { where: { id: string }; include?: Record<string, unknown> }): Promise<FranchiseOutletProfileRecord | null>;
    findMany(args: { where?: Record<string, unknown>; include?: Record<string, unknown> }): Promise<ReadonlyArray<FranchiseOutletProfileRecord & Record<string, unknown>>>;
    count(args: { where?: Record<string, unknown> }): Promise<number>;
  };
}

export function createFranchiseService(prisma: FranchisePrismaClient): FranchiseService {
  return {
    async listTerritories({ tenantId }) {
      const territories = await prisma.territory.findMany({
        where: { tenantId, isActive: true },
      });
      const results = [];
      for (const territory of territories) {
        const outletCount = await prisma.franchiseOutletProfile.count({
          where: { tenantId, territoryId: territory.id, isActive: true },
        });
        const partnerCount = await prisma.franchisePartner.count({
          where: {
            tenantId,
            isActive: true,
            outletProfiles: { some: { territoryId: territory.id, isActive: true } },
          },
        });
        results.push({ ...territory, outletCount, partnerCount });
      }
      return results;
    },

    async getTerritory({ tenantId, territoryId }) {
      const territory = await prisma.territory.findUnique({ where: { id: territoryId } });
      if (territory === null || territory.tenantId !== tenantId) {
        return null;
      }
      const outletCount = await prisma.franchiseOutletProfile.count({
        where: { tenantId, territoryId: territory.id, isActive: true },
      });
      const partnerCount = await prisma.franchisePartner.count({
        where: {
          tenantId,
          isActive: true,
          outletProfiles: { some: { territoryId: territory.id, isActive: true } },
        },
      });
      return { ...territory, outletCount, partnerCount };
    },

    async createTerritory(input) {
      return prisma.territory.create({
        data: {
          tenantId: input.tenantId,
          name: input.name,
          code: input.code ?? null,
        },
      });
    },

    async listPartners({ tenantId }) {
      const partners = await prisma.franchisePartner.findMany({
        where: { tenantId, isActive: true },
      });
      const results = [];
      for (const partner of partners) {
        const outletCount = await prisma.franchiseOutletProfile.count({
          where: { tenantId, partnerId: partner.id, isActive: true },
        });
        const agreementCount = await prisma.franchiseAgreement.count({
          where: { tenantId, partnerId: partner.id, isActive: true },
        });
        results.push({ ...partner, outletCount, agreementCount });
      }
      return results;
    },

    async getPartner({ tenantId, partnerId }) {
      const partner = await prisma.franchisePartner.findUnique({ where: { id: partnerId } });
      if (partner === null || partner.tenantId !== tenantId) {
        return null;
      }
      const outletCount = await prisma.franchiseOutletProfile.count({
        where: { tenantId, partnerId: partner.id, isActive: true },
      });
      const agreementCount = await prisma.franchiseAgreement.count({
        where: { tenantId, partnerId: partner.id, isActive: true },
      });
      return { ...partner, outletCount, agreementCount };
    },

    async createPartner(input) {
      return prisma.franchisePartner.create({
        data: {
          tenantId: input.tenantId,
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          panNumber: input.panNumber ?? null,
          gstin: input.gstin ?? null,
          address: input.address ?? null,
        },
      });
    },

    async listAgreements({ tenantId }) {
      const agreements = await prisma.franchiseAgreement.findMany({
        where: { tenantId, isActive: true },
        include: {
          partner: { select: { name: true } },
          territory: { select: { name: true } },
          outlets: { select: { id: true } },
        },
      });
      return agreements.map((agreement) => ({
        id: agreement.id,
        tenantId: agreement.tenantId,
        partnerId: agreement.partnerId,
        territoryId: agreement.territoryId,
        startDate: agreement.startDate,
        endDate: agreement.endDate,
        isActive: agreement.isActive,
        createdAt: agreement.createdAt,
        updatedAt: agreement.updatedAt,
        minimumGuaranteeCents: agreement.minimumGuaranteeCents,
        mgFormulaRateBp: agreement.mgFormulaRateBp,
        mgFormulaBase: agreement.mgFormulaBase,
        variableReturnRateBp: agreement.variableReturnRateBp,
        variableReturnBasis: agreement.variableReturnBasis,
        payoutRule: agreement.payoutRule,
        termsSnapshot: (agreement.termsSnapshot ?? null) as Record<string, unknown> | null,
        effectiveFrom: agreement.effectiveFrom,
        effectiveTo: agreement.effectiveTo,
        partnerName: (agreement as unknown as Record<string, unknown>).partner ? ((agreement as unknown as Record<string, unknown>).partner as unknown as Record<string, unknown>).name as string : "Unknown",
        territoryName: (agreement as unknown as Record<string, unknown>).territory ? ((agreement as unknown as Record<string, unknown>).territory as unknown as Record<string, unknown>).name as string : "Unknown",
        outletCount: Array.isArray((agreement as unknown as Record<string, unknown>).outlets) ? ((agreement as unknown as Record<string, unknown>).outlets as unknown[]).length : 0,
      }));
    },

    async getAgreement({ tenantId, agreementId }) {
      const agreement = await prisma.franchiseAgreement.findUnique({
        where: { id: agreementId },
        include: {
          partner: { select: { name: true } },
          territory: { select: { name: true } },
          outlets: { select: { id: true } },
        },
      });
      if (agreement === null || agreement.tenantId !== tenantId) {
        return null;
      }
      return {
        id: agreement.id,
        tenantId: agreement.tenantId,
        partnerId: agreement.partnerId,
        territoryId: agreement.territoryId,
        startDate: agreement.startDate,
        endDate: agreement.endDate,
        isActive: agreement.isActive,
        createdAt: agreement.createdAt,
        updatedAt: agreement.updatedAt,
        minimumGuaranteeCents: agreement.minimumGuaranteeCents,
        mgFormulaRateBp: agreement.mgFormulaRateBp,
        mgFormulaBase: agreement.mgFormulaBase,
        variableReturnRateBp: agreement.variableReturnRateBp,
        variableReturnBasis: agreement.variableReturnBasis,
        payoutRule: agreement.payoutRule,
        termsSnapshot: (agreement.termsSnapshot ?? null) as Record<string, unknown> | null,
        effectiveFrom: agreement.effectiveFrom,
        effectiveTo: agreement.effectiveTo,
        partnerName: (agreement as unknown as Record<string, unknown>).partner ? ((agreement as unknown as Record<string, unknown>).partner as unknown as Record<string, unknown>).name as string : "Unknown",
        territoryName: (agreement as unknown as Record<string, unknown>).territory ? ((agreement as unknown as Record<string, unknown>).territory as unknown as Record<string, unknown>).name as string : "Unknown",
        outletCount: Array.isArray((agreement as unknown as Record<string, unknown>).outlets) ? ((agreement as unknown as Record<string, unknown>).outlets as unknown[]).length : 0,
      };
    },

    async createAgreement(input) {
      const data: Record<string, unknown> = {
        tenantId: input.tenantId,
        partnerId: input.partnerId,
        territoryId: input.territoryId,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
      };
      if (input.minimumGuaranteeCents !== undefined) data.minimumGuaranteeCents = input.minimumGuaranteeCents ?? null;
      if (input.mgFormulaRateBp !== undefined) data.mgFormulaRateBp = input.mgFormulaRateBp ?? null;
      if (input.mgFormulaBase !== undefined) data.mgFormulaBase = input.mgFormulaBase ?? null;
      if (input.variableReturnRateBp !== undefined) data.variableReturnRateBp = input.variableReturnRateBp ?? null;
      if (input.variableReturnBasis !== undefined) data.variableReturnBasis = input.variableReturnBasis ?? null;
      if (input.payoutRule !== undefined) data.payoutRule = input.payoutRule ?? null;
      if (input.termsSnapshot !== undefined) data.termsSnapshot = input.termsSnapshot ?? null;
      if (input.effectiveFrom !== undefined) data.effectiveFrom = input.effectiveFrom ?? null;
      if (input.effectiveTo !== undefined) data.effectiveTo = input.effectiveTo ?? null;

      return prisma.franchiseAgreement.create({
        data,
      });
    },

    async listOutlets({ tenantId }) {
      const outlets = await prisma.franchiseOutletProfile.findMany({
        where: { tenantId },
        include: {
          partner: { select: { name: true } },
          branch: { select: { name: true } },
          territory: { select: { name: true } },
        },
      });
      return outlets.map((outlet) => ({
        id: outlet.id,
        tenantId: outlet.tenantId,
        partnerId: outlet.partnerId,
        branchId: outlet.branchId,
        territoryId: outlet.territoryId,
        outletType: outlet.outletType,
        investmentCents: outlet.investmentCents,
        isActive: outlet.isActive,
        createdAt: outlet.createdAt,
        updatedAt: outlet.updatedAt,
        partnerName: (outlet as unknown as Record<string, unknown>).partner ? ((outlet as unknown as Record<string, unknown>).partner as unknown as Record<string, unknown>).name as string : "Unknown",
        branchName: (outlet as unknown as Record<string, unknown>).branch ? ((outlet as unknown as Record<string, unknown>).branch as unknown as Record<string, unknown>).name as string : "Unknown",
        territoryName: (outlet as unknown as Record<string, unknown>).territory ? ((outlet as unknown as Record<string, unknown>).territory as unknown as Record<string, unknown>).name as string : null,
      }));
    },

    async getOutlet({ tenantId, outletId }) {
      const outlet = await prisma.franchiseOutletProfile.findUnique({
        where: { id: outletId },
        include: {
          partner: { select: { name: true } },
          branch: { select: { name: true } },
          territory: { select: { name: true } },
        },
      });
      if (outlet === null || outlet.tenantId !== tenantId) {
        return null;
      }
      return {
        id: outlet.id,
        tenantId: outlet.tenantId,
        partnerId: outlet.partnerId,
        branchId: outlet.branchId,
        territoryId: outlet.territoryId,
        outletType: outlet.outletType,
        investmentCents: outlet.investmentCents,
        isActive: outlet.isActive,
        createdAt: outlet.createdAt,
        updatedAt: outlet.updatedAt,
        partnerName: (outlet as unknown as unknown as Record<string, unknown>).partner ? ((outlet as unknown as unknown as Record<string, unknown>).partner as unknown as Record<string, unknown>).name as string : "Unknown",
        branchName: (outlet as unknown as unknown as Record<string, unknown>).branch ? ((outlet as unknown as unknown as Record<string, unknown>).branch as unknown as Record<string, unknown>).name as string : "Unknown",
        territoryName: (outlet as unknown as unknown as Record<string, unknown>).territory ? ((outlet as unknown as unknown as Record<string, unknown>).territory as unknown as Record<string, unknown>).name as string : null,
      };
    },

    async createOutlet(input) {
      return prisma.franchiseOutletProfile.create({
        data: {
          tenantId: input.tenantId,
          partnerId: input.partnerId,
          branchId: input.branchId,
          territoryId: input.territoryId ?? null,
          outletType: input.outletType ?? "STANDALONE",
          investmentCents: input.investmentCents ?? null,
        },
      });
    },

    async getDashboard({ tenantId }) {
      const [territories, partners, agreements, outlets] = await Promise.all([
        prisma.territory.findMany({ where: { tenantId, isActive: true } }),
        prisma.franchisePartner.findMany({ where: { tenantId, isActive: true } }),
        prisma.franchiseAgreement.findMany({
          where: { tenantId, isActive: true },
          include: {
            partner: { select: { name: true } },
            territory: { select: { name: true } },
            outlets: { select: { id: true } },
          },
        }),
        prisma.franchiseOutletProfile.findMany({
          where: { tenantId },
          include: {
            partner: { select: { name: true } },
            branch: { select: { name: true } },
            territory: { select: { name: true } },
          },
        }),
      ]);

      const territoryResults = [];
      for (const territory of territories) {
        const outletCount = await prisma.franchiseOutletProfile.count({
          where: { tenantId, territoryId: territory.id, isActive: true },
        });
        const partnerCount = await prisma.franchisePartner.count({
          where: {
            tenantId,
            isActive: true,
            outletProfiles: { some: { territoryId: territory.id, isActive: true } },
          },
        });
        territoryResults.push({ ...territory, outletCount, partnerCount });
      }

      const partnerResults = [];
      for (const partner of partners) {
        const outletCount = await prisma.franchiseOutletProfile.count({
          where: { tenantId, partnerId: partner.id, isActive: true },
        });
        const agreementCount = await prisma.franchiseAgreement.count({
          where: { tenantId, partnerId: partner.id, isActive: true },
        });
        partnerResults.push({ ...partner, outletCount, agreementCount });
      }

      const agreementResults = agreements.map((agreement) => ({
        id: agreement.id,
        tenantId: agreement.tenantId,
        partnerId: agreement.partnerId,
        territoryId: agreement.territoryId,
        startDate: agreement.startDate,
        endDate: agreement.endDate,
        isActive: agreement.isActive,
        createdAt: agreement.createdAt,
        updatedAt: agreement.updatedAt,
        minimumGuaranteeCents: agreement.minimumGuaranteeCents,
        mgFormulaRateBp: agreement.mgFormulaRateBp,
        mgFormulaBase: agreement.mgFormulaBase,
        variableReturnRateBp: agreement.variableReturnRateBp,
        variableReturnBasis: agreement.variableReturnBasis,
        payoutRule: agreement.payoutRule,
        termsSnapshot: (agreement.termsSnapshot ?? null) as Record<string, unknown> | null,
        effectiveFrom: agreement.effectiveFrom,
        effectiveTo: agreement.effectiveTo,
        partnerName: (agreement as unknown as Record<string, unknown>).partner ? ((agreement as unknown as Record<string, unknown>).partner as unknown as Record<string, unknown>).name as string : "Unknown",
        territoryName: (agreement as unknown as Record<string, unknown>).territory ? ((agreement as unknown as Record<string, unknown>).territory as unknown as Record<string, unknown>).name as string : "Unknown",
        outletCount: Array.isArray((agreement as unknown as Record<string, unknown>).outlets) ? ((agreement as unknown as Record<string, unknown>).outlets as unknown[]).length : 0,
      }));

      const outletResults = outlets.map((outlet) => ({
        id: outlet.id,
        tenantId: outlet.tenantId,
        partnerId: outlet.partnerId,
        branchId: outlet.branchId,
        territoryId: outlet.territoryId,
        outletType: outlet.outletType,
        investmentCents: outlet.investmentCents,
        isActive: outlet.isActive,
        createdAt: outlet.createdAt,
        updatedAt: outlet.updatedAt,
        partnerName: (outlet as unknown as Record<string, unknown>).partner ? ((outlet as unknown as Record<string, unknown>).partner as unknown as Record<string, unknown>).name as string : "Unknown",
        branchName: (outlet as unknown as Record<string, unknown>).branch ? ((outlet as unknown as Record<string, unknown>).branch as unknown as Record<string, unknown>).name as string : "Unknown",
        territoryName: (outlet as unknown as Record<string, unknown>).territory ? ((outlet as unknown as Record<string, unknown>).territory as unknown as Record<string, unknown>).name as string : null,
      }));

      return {
        territories: territoryResults,
        partners: partnerResults,
        agreements: agreementResults,
        outlets: outletResults,
        summary: {
          totalTerritories: territories.length,
          totalPartners: partners.length,
          totalAgreements: agreements.length,
          totalOutlets: outlets.length,
          activeOutlets: outlets.filter((o) => o.isActive).length,
          inactiveOutlets: outlets.filter((o) => !o.isActive).length,
        },
      };
    },
  };
}
