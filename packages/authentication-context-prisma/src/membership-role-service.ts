import { getRoleScopeMetadata, type ScopeType } from "./xnail-role-bootstrap";

export interface MembershipRoleAssignment {
  readonly id: string;
  readonly membershipId: string;
  readonly roleId: string;
  readonly scope: {
    readonly kind: "tenant";
  } | {
    readonly kind: "business-unit";
    readonly businessUnitId: string;
  } | {
    readonly kind: "branch";
    readonly businessUnitId: string;
    readonly branchId: string;
  } | {
    readonly kind: "territory";
    readonly territoryId: string;
  };
}

export interface MembershipRoleCreateInput {
  readonly membershipId: string;
  readonly roleId: string;
  readonly scope:
    | { readonly kind: "tenant" }
    | { readonly kind: "business-unit"; readonly businessUnitId: string }
    | { readonly kind: "branch"; readonly businessUnitId: string; readonly branchId: string }
    | { readonly kind: "territory"; readonly territoryId: string };
}

export interface MembershipRoleService {
  assignRole(input: MembershipRoleCreateInput & { tenantId: string; actorUserId: string }): Promise<MembershipRoleAssignment>;
  removeRole(args: { tenantId: string; assignmentId: string; scope: { kind: "tenant" } | { kind: "business-unit" } | { kind: "branch" } | { kind: "territory" }; actorUserId: string }): Promise<boolean>;
}

interface MembershipRolePrismaClient {
  readonly tenantMembership: {
    findFirst(args: { where: { tenantId: string; id: string } }): Promise<{ id: string } | null>;
  };
  readonly role: {
    findFirst(args: { where: { tenantId: string; id: string }; select?: { id: true; code: true } }): Promise<{ id: string; code: string } | null>;
  };
  readonly businessUnit: {
    findFirst(args: { where: { tenantId: string; id: string } }): Promise<{ id: string } | null>;
  };
  readonly branch: {
    findFirst(args: { where: { tenantId: string; id: string } }): Promise<{ id: string } | null>;
  };
  readonly territory: {
    findFirst(args: { where: { tenantId: string; id: string; isActive: true } }): Promise<{ id: string } | null>;
  };
  readonly membershipRole: {
    create(args: { data: { tenantId: string; membershipId: string; roleId: string } }): Promise<{ id: string }>;
    findFirst(args: { where: { id: string; tenantId: string } }): Promise<{ id: string } | null>;
    delete(args: { where: { id: string } }): Promise<{ id: string }>;
  };
  readonly businessUnitMembershipRole: {
    create(args: { data: { tenantId: string; membershipId: string; roleId: string; businessUnitId: string } }): Promise<{ id: string }>;
    findFirst(args: { where: { id: string; tenantId: string } }): Promise<{ id: string } | null>;
    delete(args: { where: { id: string } }): Promise<{ id: string }>;
  };
  readonly branchMembershipRole: {
    create(args: { data: { tenantId: string; membershipId: string; roleId: string; businessUnitId: string; branchId: string } }): Promise<{ id: string }>;
    findFirst(args: { where: { id: string; tenantId: string } }): Promise<{ id: string } | null>;
    delete(args: { where: { id: string } }): Promise<{ id: string }>;
  };
  readonly territoryMembershipRole: {
    create(args: { data: { tenantId: string; membershipId: string; roleId: string; territoryId: string } }): Promise<{ id: string }>;
    findFirst(args: { where: { id: string; tenantId: string } }): Promise<{ id: string } | null>;
    delete(args: { where: { id: string } }): Promise<{ id: string }>;
  };
  readonly auditLog: {
    create(args: { data: { tenantId: string; actorUserId: string; action: string; entityType: string; entityId: string; metadata: Record<string, unknown> } }): Promise<unknown>;
  };
}

const SCOPE_KIND_TO_SCOPE_TYPE: Record<string, ScopeType> = {
  "tenant": "TENANT",
  "business-unit": "BUSINESS_UNIT",
  "branch": "BRANCH",
  "territory": "TERRITORY",
};

function validateScopeKind(
  roleCode: string,
  scopeKind: string,
): void {
  const meta = getRoleScopeMetadata(roleCode);
  if (meta === undefined) {
    return;
  }
  if (!meta.requiresScope) {
    if (scopeKind !== "tenant") {
      throw new Error(
        `Role "${roleCode}" does not require a scope; only tenant scope is allowed`,
      );
    }
    return;
  }
  const expectedScopeType = SCOPE_KIND_TO_SCOPE_TYPE[scopeKind];
  if (expectedScopeType === undefined) {
    throw new Error(`Invalid scope kind: ${scopeKind}`);
  }
  if (expectedScopeType !== meta.scopeType) {
    throw new Error(
      `Role "${roleCode}" requires ${meta.scopeType} scope, but ${scopeKind} scope was provided`,
    );
  }
}

export function createMembershipRoleService(prisma: MembershipRolePrismaClient): MembershipRoleService {
  return {
    async assignRole({ tenantId, membershipId, roleId, scope, actorUserId }) {
      const membership = await prisma.tenantMembership.findFirst({
        where: { tenantId, id: membershipId },
      });
      if (membership === null) {
        throw new Error("Membership not found in tenant");
      }

      const role = await prisma.role.findFirst({
        where: { tenantId, id: roleId },
        select: { id: true, code: true },
      });
      if (role === null) {
        throw new Error("Role not found in tenant");
      }

      validateScopeKind(role.code, scope.kind);

      if (scope.kind === "business-unit") {
        const businessUnit = await prisma.businessUnit.findFirst({
          where: { tenantId, id: scope.businessUnitId },
        });
        if (businessUnit === null) {
          throw new Error("Business unit not found in tenant");
        }
        const record = await prisma.businessUnitMembershipRole.create({
          data: { tenantId, membershipId, roleId, businessUnitId: scope.businessUnitId },
        });
        try {
          await prisma.auditLog.create({
            data: {
              tenantId,
              actorUserId,
              action: "membership-role.assigned",
              entityType: "BusinessUnitMembershipRole",
              entityId: record.id,
              metadata: { membershipId, roleId, businessUnitId: scope.businessUnitId },
            },
          });
        } catch {
          // Audit logging is best-effort.
        }
        return { id: record.id, membershipId, roleId, scope: { kind: "business-unit", businessUnitId: scope.businessUnitId } };
      }

      if (scope.kind === "branch") {
        const businessUnit = await prisma.businessUnit.findFirst({
          where: { tenantId, id: scope.businessUnitId },
        });
        if (businessUnit === null) {
          throw new Error("Business unit not found in tenant");
        }
        const branch = await prisma.branch.findFirst({
          where: { tenantId, id: scope.branchId },
        });
        if (branch === null) {
          throw new Error("Branch not found in tenant");
        }
        const record = await prisma.branchMembershipRole.create({
          data: { tenantId, membershipId, roleId, businessUnitId: scope.businessUnitId, branchId: scope.branchId },
        });
        try {
          await prisma.auditLog.create({
            data: {
              tenantId,
              actorUserId,
              action: "membership-role.assigned",
              entityType: "BranchMembershipRole",
              entityId: record.id,
              metadata: { membershipId, roleId, businessUnitId: scope.businessUnitId, branchId: scope.branchId },
            },
          });
        } catch {
          // Audit logging is best-effort.
        }
        return { id: record.id, membershipId, roleId, scope: { kind: "branch", businessUnitId: scope.businessUnitId, branchId: scope.branchId } };
      }

      if (scope.kind === "territory") {
        const territory = await prisma.territory.findFirst({
          where: { tenantId, id: scope.territoryId, isActive: true },
        });
        if (territory === null) {
          throw new Error("Territory not found in tenant");
        }
        const record = await prisma.territoryMembershipRole.create({
          data: { tenantId, membershipId, roleId, territoryId: scope.territoryId },
        });
        try {
          await prisma.auditLog.create({
            data: {
              tenantId,
              actorUserId,
              action: "membership-role.assigned",
              entityType: "TerritoryMembershipRole",
              entityId: record.id,
              metadata: { membershipId, roleId, territoryId: scope.territoryId },
            },
          });
        } catch {
          // Audit logging is best-effort.
        }
        return { id: record.id, membershipId, roleId, scope: { kind: "territory", territoryId: scope.territoryId } };
      }

      const record = await prisma.membershipRole.create({
        data: { tenantId, membershipId, roleId },
      });
      try {
        await prisma.auditLog.create({
          data: {
            tenantId,
            actorUserId,
            action: "membership-role.assigned",
            entityType: "MembershipRole",
            entityId: record.id,
            metadata: { membershipId, roleId },
          },
        });
      } catch {
        // Audit logging is best-effort.
      }
      return { id: record.id, membershipId, roleId, scope: { kind: "tenant" } };
    },
    async removeRole({ tenantId, assignmentId, scope, actorUserId }) {
      if (scope.kind === "business-unit") {
        const existing = await prisma.businessUnitMembershipRole.findFirst({
          where: { id: assignmentId, tenantId },
        });
        if (existing === null) {
          return false;
        }
        await prisma.businessUnitMembershipRole.delete({ where: { id: assignmentId } });
        try {
          await prisma.auditLog.create({
            data: {
              tenantId,
              actorUserId,
              action: "membership-role.removed",
              entityType: "BusinessUnitMembershipRole",
              entityId: assignmentId,
              metadata: {},
            },
          });
        } catch {
          // Audit logging is best-effort.
        }
        return true;
      }

      if (scope.kind === "branch") {
        const existing = await prisma.branchMembershipRole.findFirst({
          where: { id: assignmentId, tenantId },
        });
        if (existing === null) {
          return false;
        }
        await prisma.branchMembershipRole.delete({ where: { id: assignmentId } });
        try {
          await prisma.auditLog.create({
            data: {
              tenantId,
              actorUserId,
              action: "membership-role.removed",
              entityType: "BranchMembershipRole",
              entityId: assignmentId,
              metadata: {},
            },
          });
        } catch {
          // Audit logging is best-effort.
        }
        return true;
      }

      if (scope.kind === "territory") {
        const existing = await prisma.territoryMembershipRole.findFirst({
          where: { id: assignmentId, tenantId },
        });
        if (existing === null) {
          return false;
        }
        await prisma.territoryMembershipRole.delete({ where: { id: assignmentId } });
        try {
          await prisma.auditLog.create({
            data: {
              tenantId,
              actorUserId,
              action: "membership-role.removed",
              entityType: "TerritoryMembershipRole",
              entityId: assignmentId,
              metadata: {},
            },
          });
        } catch {
          // Audit logging is best-effort.
        }
        return true;
      }

      const existing = await prisma.membershipRole.findFirst({
        where: { id: assignmentId, tenantId },
      });
      if (existing === null) {
        return false;
      }
      await prisma.membershipRole.delete({ where: { id: assignmentId } });
      try {
        await prisma.auditLog.create({
          data: {
            tenantId,
            actorUserId,
            action: "membership-role.removed",
            entityType: "MembershipRole",
            entityId: assignmentId,
            metadata: {},
          },
        });
      } catch {
        // Audit logging is best-effort.
      }
      return true;
    },
  };
}
