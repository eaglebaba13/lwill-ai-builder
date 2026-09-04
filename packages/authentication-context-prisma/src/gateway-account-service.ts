export interface GatewayAccountRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly provider: string;
  readonly label: string | null;
  readonly isActive: boolean;
  readonly config: Record<string, unknown> | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface GatewayAccountPublicDTO {
  readonly id: string;
  readonly provider: string;
  readonly label: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface GatewayAccountCreateInput {
  readonly provider: string;
  readonly label?: string | null;
  readonly isActive?: boolean;
  readonly config?: Record<string, unknown> | null;
}

export interface GatewayAccountUpdateInput {
  readonly label?: string | null;
  readonly isActive?: boolean;
  readonly config?: Record<string, unknown> | null;
}

export interface GatewayAccountService {
  createGatewayAccount(tenantId: string, input: GatewayAccountCreateInput): Promise<GatewayAccountPublicDTO>;
  listGatewayAccounts(tenantId: string): Promise<readonly GatewayAccountPublicDTO[]>;
  getGatewayAccount(tenantId: string, accountId: string): Promise<GatewayAccountPublicDTO | null>;
  getGatewayAccountWithConfig(tenantId: string, accountId: string): Promise<GatewayAccountRecord | null>;
  updateGatewayAccount(tenantId: string, accountId: string, input: GatewayAccountUpdateInput): Promise<GatewayAccountPublicDTO | null>;
  deleteGatewayAccount(tenantId: string, accountId: string): Promise<boolean>;
}

interface GatewayAccountPrismaClient {
  readonly gatewayAccount: {
    create: (args: { data: Record<string, unknown> }) => Promise<GatewayAccountRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<GatewayAccountRecord | null>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<GatewayAccountRecord[]>;
    update: (args: { data: Record<string, unknown>; where: { id: string } }) => Promise<GatewayAccountRecord>;
    delete: (args: { where: { id: string } }) => Promise<GatewayAccountRecord>;
  };
}

function toPublicDTO(record: GatewayAccountRecord): GatewayAccountPublicDTO {
  const { config: _config, ...rest } = record;
  return rest;
}

export function createGatewayAccountService(
  prisma: GatewayAccountPrismaClient,
): GatewayAccountService {
  return {
    async createGatewayAccount(tenantId, input) {
      const record = await prisma.gatewayAccount.create({
        data: {
          tenantId,
          provider: input.provider,
          label: input.label ?? null,
          isActive: input.isActive ?? true,
          config: input.config ?? null,
        },
      });
      return toPublicDTO(record);
    },

    async listGatewayAccounts(tenantId) {
      const records = await prisma.gatewayAccount.findMany({
        where: { tenantId },
      });
      return records.map(toPublicDTO);
    },

    async getGatewayAccount(tenantId, accountId) {
      const record = await prisma.gatewayAccount.findUnique({ where: { id: accountId } });
      if (record === null || record.tenantId !== tenantId) {
        return null;
      }
      return toPublicDTO(record);
    },

    async getGatewayAccountWithConfig(tenantId, accountId) {
      const record = await prisma.gatewayAccount.findUnique({ where: { id: accountId } });
      if (record === null || record.tenantId !== tenantId) {
        return null;
      }
      return record;
    },

    async updateGatewayAccount(tenantId, accountId, input) {
      const existing = await prisma.gatewayAccount.findUnique({ where: { id: accountId } });
      if (existing === null || existing.tenantId !== tenantId) {
        return null;
      }
      const data: Record<string, unknown> = {};
      if (input.label !== undefined) data.label = input.label;
      if (input.isActive !== undefined) data.isActive = input.isActive;
      if (input.config !== undefined) data.config = input.config;
      const record = await prisma.gatewayAccount.update({ where: { id: accountId }, data });
      return toPublicDTO(record);
    },

    async deleteGatewayAccount(tenantId, accountId) {
      const existing = await prisma.gatewayAccount.findUnique({ where: { id: accountId } });
      if (existing === null || existing.tenantId !== tenantId) {
        return false;
      }
      await prisma.gatewayAccount.delete({ where: { id: accountId } });
      return true;
    },
  };
}
