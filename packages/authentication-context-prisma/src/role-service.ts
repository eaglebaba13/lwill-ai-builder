export interface PermissionRecord {
  readonly id: string;
  readonly code: string;
  readonly description: string | null;
}

export interface RoleRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly isSystem: boolean;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly permissions: readonly PermissionRecord[];
}

export interface RoleUpdateInput {
  readonly name?: string;
  readonly description?: string | null;
  readonly isActive?: boolean;
}

export interface RoleService {
  listRoles(args: { tenantId: string }): Promise<readonly RoleRecord[]>;
  getRole(args: { tenantId: string; roleId: string }): Promise<RoleRecord | null>;
  updateRole(args: {
    tenantId: string;
    roleId: string;
    input: RoleUpdateInput;
    actorUserId: string;
  }): Promise<RoleRecord | null>;
  deleteRole(args: { tenantId: string; roleId: string; actorUserId: string }): Promise<boolean>;
}

interface RolePrismaClient {
  readonly role: {
    findMany(args: {
      where: { tenantId: string };
      include: { permissions: { include: { permission: { select: { id: true; code: true; description: true } } } } };
    }): Promise<RoleRecord[]>;
    findUnique(args: {
      where: { tenantId_id: { tenantId: string; id: string } };
      select?: { id: true; code: true; isSystem: true };
      include?: { permissions: { include: { permission: { select: { id: true; code: true; description: true } } } } };
    }): Promise<RoleRecord | null>;
    update(args: { where: { tenantId_id: { tenantId: string; id: string } }; data: { name?: string; description?: string | null; isActive?: boolean } }): Promise<RoleRecord>;
    delete(args: { where: { tenantId_id: { tenantId: string; id: string } } }): Promise<RoleRecord>;
  };
  readonly auditLog: {
    create(args: { data: { tenantId: string; actorUserId: string; action: string; entityType: string; entityId: string; metadata: Record<string, unknown> } }): Promise<unknown>;
  };
}

export function createRoleService(prisma: RolePrismaClient): RoleService {
  return {
    async listRoles({ tenantId }) {
      return prisma.role.findMany({
        where: { tenantId },
        include: { permissions: { include: { permission: { select: { id: true, code: true, description: true } } } } },
      });
    },
    async getRole({ tenantId, roleId }) {
      return prisma.role.findUnique({
        where: { tenantId_id: { tenantId, id: roleId } },
        include: { permissions: { include: { permission: { select: { id: true, code: true, description: true } } } } },
      });
    },
    async updateRole({ tenantId, roleId, input, actorUserId }) {
      const existing = await prisma.role.findUnique({
        where: { tenantId_id: { tenantId, id: roleId } },
        select: { id: true, code: true, isSystem: true },
      });
      if (existing === null) {
        return null;
      }
      if (existing.code === "tenant-admin") {
        throw new Error("Cannot modify protected tenant-admin role");
      }
      const data: { name?: string; description?: string | null; isActive?: boolean } = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.description !== undefined) data.description = input.description;
      if (input.isActive !== undefined) data.isActive = input.isActive;
      const updated = await prisma.role.update({ where: { tenantId_id: { tenantId, id: roleId } }, data });
      try {
        await prisma.auditLog.create({
          data: {
            tenantId,
            actorUserId,
            action: "role.updated",
            entityType: "Role",
            entityId: roleId,
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
    async deleteRole({ tenantId, roleId, actorUserId }) {
      const existing = await prisma.role.findUnique({
        where: { tenantId_id: { tenantId, id: roleId } },
        select: { id: true, code: true, isSystem: true },
      });
      if (existing === null) {
        return false;
      }
      if (existing.code === "tenant-admin" || existing.isSystem) {
        throw new Error("Cannot delete protected role");
      }
      await prisma.role.delete({ where: { tenantId_id: { tenantId, id: roleId } } });
      try {
        await prisma.auditLog.create({
          data: {
            tenantId,
            actorUserId,
            action: "role.deleted",
            entityType: "Role",
            entityId: roleId,
            metadata: {},
          },
        });
      } catch {
        // Audit logging is best-effort; do not block the mutation on audit failure.
      }
      return true;
    },
  };
}
