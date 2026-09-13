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

export interface UserCreateInput {
  readonly email: string;
  readonly displayName: string;
  readonly password: string;
  readonly roleId?: string | null;
}

export interface UserService {
  listUsers(args: { tenantId: string }): Promise<readonly UserRecord[]>;
  getUser(args: { tenantId: string; userId: string }): Promise<UserRecord | null>;
  createUser(args: {
    tenantId: string;
    input: UserCreateInput;
    actorUserId: string;
    hashPassword?: (password: string) => Promise<string>;
  }): Promise<UserRecord>;
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
    create(args: { data: { tenantId: string; userId: string; isActive: true } }): Promise<{ id: string }>;
  };
  readonly user: {
    findUnique(args: { where: { id: string } | { email: string }; select: { id: true; email: true; displayName: true; isActive: true; createdAt: true; updatedAt: true } }): Promise<UserRecord | null>;
    create(args: { data: { email: string; displayName: string; isActive: true } }): Promise<UserRecord>;
    update(args: { where: { id: string }; data: { displayName?: string | null; isActive?: boolean } }): Promise<UserRecord>;
  };
  readonly passwordCredential: {
    create(args: { data: { userId: string; passwordHash: string } }): Promise<unknown>;
  };
  readonly membershipRole: {
    create(args: { data: { tenantId: string; membershipId: string; roleId: string } }): Promise<unknown>;
  };
  readonly role: {
    findFirst(args: { where: { tenantId: string; id: string; isActive: true }; select: { id: true } }): Promise<{ id: string } | null>;
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
    async createUser({ tenantId, input, actorUserId, hashPassword }) {
      const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true, email: true, displayName: true, isActive: true, createdAt: true, updatedAt: true } });
      if (existing !== null) {
        throw new Error("A user with this email already exists");
      }

      const user = await prisma.user.create({
        data: { email: input.email, displayName: input.displayName, isActive: true },
      });

      const hash = hashPassword ? await hashPassword(input.password) : input.password;
      await prisma.passwordCredential.create({
        data: { userId: user.id, passwordHash: hash },
      });

      const membership = await prisma.tenantMembership.create({
        data: { tenantId, userId: user.id, isActive: true },
      });

      if (input.roleId) {
        const role = await prisma.role.findFirst({
          where: { tenantId, id: input.roleId, isActive: true },
          select: { id: true },
        });
        if (role !== null) {
          await prisma.membershipRole.create({
            data: { tenantId, membershipId: membership.id, roleId: role.id },
          });
        }
      }

      try {
        await prisma.auditLog.create({
          data: {
            tenantId,
            actorUserId,
            action: "user.created",
            entityType: "User",
            entityId: user.id,
            metadata: { email: input.email, displayName: input.displayName, roleId: input.roleId ?? null },
          },
        });
      } catch {
        // Audit logging is best-effort
      }

      return { ...user, membershipId: membership.id };
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
