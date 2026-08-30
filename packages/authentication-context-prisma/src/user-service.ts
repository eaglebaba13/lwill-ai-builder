export interface UserRecord {
  readonly id: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly membershipId: string;
}

export interface UserUpdateInput {
  readonly displayName?: string | null;
  readonly isActive?: boolean;
}

export interface UserService {
  listUsers(args: { tenantId: string }): Promise<readonly UserRecord[]>;
  getUser(args: { tenantId: string; userId: string }): Promise<UserRecord | null>;
  updateUser(args: {
    tenantId: string;
    userId: string;
    input: UserUpdateInput;
    actorUserId: string;
  }): Promise<UserRecord | null>;
}

interface UserPrismaClient {
  readonly tenantMembership: {
    findMany(args: {
      where: { tenantId: string };
      include: { user: { select: { id: true; email: true; displayName: true; isActive: true; createdAt: true; updatedAt: true } } };
    }): Promise<Array<{ id: string; user: UserRecord }>>;
    findUnique(args: {
      where: { tenantId_userId: { tenantId: string; userId: string } };
      include?: { user: { select: { id: true; email: true; displayName: true; isActive: true; createdAt: true; updatedAt: true } } };
    }): Promise<{ id: string; user: UserRecord } | null>;
  };
  readonly user: {
    findUnique(args: { where: { id: string }; select: { id: true; email: true; displayName: true; isActive: true; createdAt: true; updatedAt: true } }): Promise<UserRecord | null>;
    update(args: { where: { id: string }; data: { displayName?: string | null; isActive?: boolean } }): Promise<UserRecord>;
  };
  readonly auditLog: {
    create(args: { data: { tenantId: string; actorUserId: string; action: string; entityType: string; entityId: string; metadata: Record<string, unknown> } }): Promise<unknown>;
  };
}

export function createUserService(prisma: UserPrismaClient): UserService {
  return {
    async listUsers({ tenantId }) {
      const memberships = await prisma.tenantMembership.findMany({
        where: { tenantId },
        include: { user: { select: { id: true, email: true, displayName: true, isActive: true, createdAt: true, updatedAt: true } } },
      });
      return memberships.map((membership) => ({ ...membership.user, membershipId: membership.id }));
    },
    async getUser({ tenantId, userId }) {
      const membership = await prisma.tenantMembership.findUnique({
        where: { tenantId_userId: { tenantId, userId } },
        include: { user: { select: { id: true, email: true, displayName: true, isActive: true, createdAt: true, updatedAt: true } } },
      });
      if (membership === null) {
        return null;
      }
      return { ...membership.user, membershipId: membership.id };
    },
    async updateUser({ tenantId, userId, input, actorUserId }) {
      const membership = await prisma.tenantMembership.findUnique({
        where: { tenantId_userId: { tenantId, userId } },
      });
      if (membership === null) {
        return null;
      }
      const data: { displayName?: string | null; isActive?: boolean } = {};
      if (input.displayName !== undefined) data.displayName = input.displayName;
      if (input.isActive !== undefined) data.isActive = input.isActive;
      const updated = await prisma.user.update({ where: { id: userId }, data });
      try {
        await prisma.auditLog.create({
          data: {
            tenantId,
            actorUserId,
            action: "user.updated",
            entityType: "User",
            entityId: userId,
            metadata: {
              changes: data,
            },
          },
        });
      } catch {
        // Audit logging is best-effort; do not block the mutation on audit failure.
      }
      return updated;
    },
  };
}
