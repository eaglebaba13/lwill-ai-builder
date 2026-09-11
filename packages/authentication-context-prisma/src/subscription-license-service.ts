export const SUBSCRIPTION_STATUSES = ["ACTIVE", "TRIAL", "EXPIRED", "SUSPENDED", "CANCELLED"] as const;
export const LICENSE_STATUSES = ["ACTIVE", "EXPIRED", "SUSPENDED", "REVOKED"] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export type LicenseStatus = (typeof LICENSE_STATUSES)[number];

export interface TenantSubscriptionRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly planName: string;
  readonly status: string;
  readonly startedAt: Date;
  readonly renewsAt: Date | null;
  readonly expiresAt: Date | null;
  readonly cancelledAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface TenantLicenseRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly status: string;
  readonly issuedAt: Date;
  readonly expiresAt: Date | null;
  readonly features: Record<string, unknown> | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SubscriptionCreateInput {
  readonly planName: string;
  readonly status?: string;
  readonly renewsAt?: Date | null;
  readonly expiresAt?: Date | null;
}

export interface SubscriptionUpdateInput {
  readonly planName?: string;
  readonly status?: string;
  readonly renewsAt?: Date | null;
  readonly expiresAt?: Date | null;
  readonly cancelledAt?: Date | null;
}

export interface LicenseCreateInput {
  readonly status?: string;
  readonly expiresAt?: Date | null;
  readonly features?: Record<string, unknown> | null;
}

export interface LicenseUpdateInput {
  readonly status?: string;
  readonly expiresAt?: Date | null;
  readonly features?: Record<string, unknown> | null;
}

export interface SubscriptionLicenseService {
  getSubscription(args: { tenantId: string }): Promise<TenantSubscriptionRecord | null>;
  createSubscription(args: { tenantId: string; input: SubscriptionCreateInput; actorUserId?: string | null }): Promise<TenantSubscriptionRecord>;
  updateSubscription(args: { tenantId: string; input: SubscriptionUpdateInput; actorUserId?: string | null }): Promise<TenantSubscriptionRecord | null>;
  getLicense(args: { tenantId: string }): Promise<TenantLicenseRecord | null>;
  createLicense(args: { tenantId: string; input: LicenseCreateInput; actorUserId?: string | null }): Promise<TenantLicenseRecord>;
  updateLicense(args: { tenantId: string; input: LicenseUpdateInput; actorUserId?: string | null }): Promise<TenantLicenseRecord | null>;
}

interface SubscriptionLicensePrismaClient {
  readonly tenant: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; isActive: boolean } | null>;
  };
  readonly tenantSubscription: {
    findUnique: (args: { where: { tenantId: string } }) => Promise<TenantSubscriptionRecord | null>;
    create: (args: { data: Record<string, unknown> }) => Promise<TenantSubscriptionRecord>;
    update: (args: { where: { tenantId: string }; data: Record<string, unknown> }) => Promise<TenantSubscriptionRecord>;
  };
  readonly tenantLicense: {
    findUnique: (args: { where: { tenantId: string } }) => Promise<TenantLicenseRecord | null>;
    create: (args: { data: Record<string, unknown> }) => Promise<TenantLicenseRecord>;
    update: (args: { where: { tenantId: string }; data: Record<string, unknown> }) => Promise<TenantLicenseRecord>;
  };
  readonly auditLog: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
}

function recordAudit(
  prisma: SubscriptionLicensePrismaClient,
  args: { tenantId: string; actorUserId: string | null; action: string; entityType: string; entityId: string; metadata: Record<string, unknown> },
): void {
  const auditLog = (prisma as { auditLog?: unknown }).auditLog;
  if (auditLog === undefined) return;
  void (auditLog as { create: (a: { data: Record<string, unknown> }) => Promise<unknown> })
    .create({ data: args })
    .catch(() => {});
}

export function createSubscriptionLicenseService(prisma: SubscriptionLicensePrismaClient): SubscriptionLicenseService {
  return {
    async getSubscription({ tenantId }) {
      return prisma.tenantSubscription.findUnique({ where: { tenantId } });
    },

    async createSubscription({ tenantId, input, actorUserId }) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (tenant === null) {
        throw new Error("tenant not found");
      }

      const existing = await prisma.tenantSubscription.findUnique({ where: { tenantId } });
      if (existing !== null) {
        throw new Error("subscription already exists for this tenant");
      }

      const subscription = await prisma.tenantSubscription.create({
        data: {
          tenantId,
          planName: input.planName,
          status: input.status ?? "ACTIVE",
          renewsAt: input.renewsAt ?? null,
          expiresAt: input.expiresAt ?? null,
        },
      });

      recordAudit(prisma, {
        tenantId,
        actorUserId: actorUserId ?? null,
        action: "subscription.created",
        entityType: "TenantSubscription",
        entityId: subscription.id,
        metadata: { planName: subscription.planName, status: subscription.status },
      });

      return subscription;
    },

    async updateSubscription({ tenantId, input, actorUserId }) {
      const existing = await prisma.tenantSubscription.findUnique({ where: { tenantId } });
      if (existing === null) {
        return null;
      }

      const data: Record<string, unknown> = {};
      if (input.planName !== undefined) data.planName = input.planName;
      if (input.status !== undefined) {
        if (!SUBSCRIPTION_STATUSES.includes(input.status as SubscriptionStatus)) {
          throw new Error(`invalid subscription status: ${input.status}`);
        }
        data.status = input.status;
        if (input.status === "CANCELLED" && existing.cancelledAt === null) {
          data.cancelledAt = new Date();
        }
      }
      if (input.renewsAt !== undefined) data.renewsAt = input.renewsAt;
      if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt;
      if (input.cancelledAt !== undefined) data.cancelledAt = input.cancelledAt;

      if (Object.keys(data).length === 0) {
        return existing;
      }

      const updated = await prisma.tenantSubscription.update({ where: { tenantId }, data });

      recordAudit(prisma, {
        tenantId,
        actorUserId: actorUserId ?? null,
        action: "subscription.updated",
        entityType: "TenantSubscription",
        entityId: updated.id,
        metadata: { changes: data },
      });

      return updated;
    },

    async getLicense({ tenantId }) {
      return prisma.tenantLicense.findUnique({ where: { tenantId } });
    },

    async createLicense({ tenantId, input, actorUserId }) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (tenant === null) {
        throw new Error("tenant not found");
      }

      const existing = await prisma.tenantLicense.findUnique({ where: { tenantId } });
      if (existing !== null) {
        throw new Error("license already exists for this tenant");
      }

      const license = await prisma.tenantLicense.create({
        data: {
          tenantId,
          status: input.status ?? "ACTIVE",
          expiresAt: input.expiresAt ?? null,
          features: input.features ?? null,
        },
      });

      recordAudit(prisma, {
        tenantId,
        actorUserId: actorUserId ?? null,
        action: "license.created",
        entityType: "TenantLicense",
        entityId: license.id,
        metadata: { status: license.status },
      });

      return license;
    },

    async updateLicense({ tenantId, input, actorUserId }) {
      const existing = await prisma.tenantLicense.findUnique({ where: { tenantId } });
      if (existing === null) {
        return null;
      }

      const data: Record<string, unknown> = {};
      if (input.status !== undefined) {
        if (!LICENSE_STATUSES.includes(input.status as LicenseStatus)) {
          throw new Error(`invalid license status: ${input.status}`);
        }
        data.status = input.status;
      }
      if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt;
      if (input.features !== undefined) data.features = input.features;

      if (Object.keys(data).length === 0) {
        return existing;
      }

      const updated = await prisma.tenantLicense.update({ where: { tenantId }, data });

      recordAudit(prisma, {
        tenantId,
        actorUserId: actorUserId ?? null,
        action: "license.updated",
        entityType: "TenantLicense",
        entityId: updated.id,
        metadata: { changes: data },
      });

      return updated;
    },
  };
}
